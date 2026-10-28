# Contrato Planejado: Análise de IA

Contratos da primeira fase Firebase Functions v2 + Firestore. Não são endpoints implantados.
Callables e trigger validam schemas independentes em cada fronteira confiável. Não há
endpoint público ou interno de serviço para serviço, nem acesso genérico ao Firestore pelo
agente.

## 1. `startAnalysis` (Backoffice -> Firebase callable)

**Autenticação**: Firebase Auth callable; `authorizeActor(request, ['backoffice'])`.
Tenant, requester e timezone são derivados de registros autorizados no backend.

**Entrada conceitual**:

```json
{
  "idempotencyKey": "opaque-client-generated-key",
  "goal": "string limitada e sanitizada",
  "period": {
    "start": "2026-09-01",
    "endExclusive": "2026-10-01"
  }
}
```

Validar schema, campos extras, tamanho, objetivo, período e limites aprovados. Rejeitar
`tenantId`, UID, role, provider, tool list, endpoint e secret. A chave idempotente é escopada
no backend ao actor/tenant e não concede autorização.

**Comportamento**: transaction cria execução com ID opaco, status `queued`, deadline,
idempotency data e timestamps. O `onDocumentCreated` de `ai_analysis_executions/{executionId}`
é o dispatch assíncrono. Callable retorna sem esperar pesquisa/LLM.

**Resposta**:

```json
{
  "executionId": "opaque-id",
  "status": "queued",
  "createdAt": "server timestamp"
}
```

Se transação Firestore falhar, retornar erro explícito e não sucesso-shaped fallback. Uma
repetição da callable com a mesma chave e mesmo input retorna execução existente; input
divergente gera conflito.

## 2. Trigger `processAnalysisCreated` (Firestore -> Functions worker)

Evento `onDocumentCreated` com `retry: true` em coleção root server-only. Um runner
determinístico TypeScript controla o estado de aplicação e invoca agents/tools Mastra por
etapa; o desenho não depende de recuperação automática do engine workflow Mastra. O worker:

1. valida event/document identity e schema, ignora terminal ou evento redeliverado já
   concluído;
2. adquire lease/fencing token por transaction e incrementa invocation counter;
3. checa deadline 420s, máximo três invocations processadoras e stage attempt cap;
4. executa/reconstrói somente etapas não concluídas, com budget de 30s para métricas, 20s
   por tentativa Tavily e 60s por tentativa LLM; respeita deadline global; persiste
   checkpoint antes/depois de cada fronteira;
5. grava relatório e terminal atômico após validação.

Trigger é at-least-once. `retry:true` de Functions v2 pode redeliverar até 24h, com backoff
plataforma. Limite de duas novas tentativas de etapa é application-owned, não é garantia
configurável do trigger. Repetir somente falha conhecida como não aceita (p.ex. conexão antes
do envio ou HTTP 429 explícito com `Retry-After` dentro do orçamento); não repetir timeout
ou 5xx ambíguo sem idempotency suportado. Erros permanentes são persistidos como terminal e
handler retorna sucesso. Se Firestore indisponível impede salvar o terminal/contador,
platform retry window pode continuar; status callable calcula timeout efetivo após deadline.
Tentativas de provider incrementam antes do call. Backoff interno das chamadas elegíveis é
1s e 2s com jitter; não excede 420s. O timeout do worker é no máximo 540s.

Deadline do projeto é alvo a validar, não garantia de Mastra. Worker timeout não excede 540s.
Se smoke test não comprovar retomada/carga/duração, não iniciar implementação.

## 3. `getAnalysis` / `listAnalyses` (Backoffice -> Firebase callable)

Autenticada, `authorizeActor` e tenant-derived filter server-side. `getAnalysis` recebe
executionId opaco; `listAnalyses` cursor e limite capped com filtros allowlisted. IDs não
provam acesso.

Response contém status efetivo, datas/período, estágio seguro, duração, uso disponível,
relatório e fontes somente se validados e concluídos; falhas retornam código/mensagem segura.
Nunca retorna PII, prompt, output de etapa incompleta, texto bruto do provider, checkpoint
técnico interno ou registro individual.

## 4. `reviewProposal` (Backoffice -> Firebase callable)

**Entrada conceitual**:

```json
{
  "proposalId": "opaque-id",
  "proposalVersion": 1,
  "proposalHash": "sha256-hex",
  "decision": "approved"
}
```

Functions deriva ator/tenant, busca proposal e execução do mesmo tenant, valida status,
canonical payload, version/hash atuais em transação. Não aceita payload editado no request.
Rejeição também registra ator, timestamp, versão/hash. Alteração de proposta calcula novo
hash, incrementa versão e revoga decisão antiga atomicamente. Nenhum executor externo faz
parte desta entrega.

## 5. Tools internas

Não são HTTP endpoints nem acessam coleção arbitrária; são módulos TypeScript dentro do
boundary Functions/Mastra.

| Operação | Entrada | Garantias |
|---|---|---|
| `loadAuthorizedExecution` | executionId lido do documento criado | Valida estado, owner, tenant, deadline e lease |
| `getAggregatedMetrics` | executionId + período persistido | Deriva tenant da execução; aplica filtros autoritativos e retorna somente agregados |
| `saveStageCheckpoint` | executionId, stage allowlisted, inputHash e output validado | Transactional state/attempt/fencing; tamanho/schemas limitados |
| `completeAnalysis` | executionId, schemaVersion, relatório/usage | Revalida schema/rules, status e grava terminal/output uma vez |
| `recordFailure` | executionId, etapa e código allowlisted | Sanitiza categoria e transita estado sem conteúdo bruto |
| `createProposals` | executionId + payload allowlisted | Backend canonicaliza/hash/version; cria pending, sem executar |

Os argumentos de tenant, role e provider não são controlados pelo agente. Módulos chamam
services existentes e não aceitam collection name, query ou path genérico.

## 6. Tavily e provider LLM

- O runner chama Tavily e métricas em ordem fixa; o LLM não seleciona ferramentas nem faz
  loop autônomo de tool calls. Tavily recebe apenas objetivo de busca sanitizado, parâmetros
  fixos e até três resultados.
  Sem tenantId, slug, nome privado, métrica ou PII; sem endpoint arbitrário ou secret no
  prompt. Respostas são URL HTTP(S) validada, título/snippet limitados; conteúdo é evidência
  não confiável.
- LLM recebe somente métricas agregadas mínimas e fontes normalizadas, sem tools ou acesso a
  Firestore. Uma geração lógica por execução; no máximo duas retries elegíveis com deadlines;
  token cap é obrigatório após
  selecionar modelo e antes de habilitar. Repetição ambígua pode gerar custo duplicado.
- Output é schema-validado e submetido a regras determinísticas no worker/backend antes de
  exposição. Tokens/custos ausentes são `unavailable`. Secrets ficam no mecanismo de secret
  já aprovado para Functions; não em browser/build/logs.

## 7. Correlação e telemetria

Correlation ID opaco é criado no backend e propagado à execução, trigger, etapa e provider.
Logs estruturados incluem stage, state, duração, invocation/attempt count, classe de status e
usage existente. Mastra tracing nativo só é ligado após verificar redaction e desativar
captura de prompts/tool payload. Usar logger Firebase/Cloud Logging conforme Spec 008;
nenhum sink backend adicional sem aprovação. Logs não recebem tokens, segredo, PII,
conteúdo integral de pesquisa, prompt sensível ou erro cru com request payload.

## 8. Segurança e teste de contrato

- Rules Firestore deny-by-default para coleções AI; callables autenticadas; tenant deriva do
  usuário/registro; duas empresas em todos os testes de isolamento.
- Trigger só processa documento criado por backend, mas ainda valida tenant/owner/schema;
  event ID e transaction/checkpoint protegem at-least-once.
- Casos de negação: anônimo, role errado, inativo, claims divergentes, tenant adulterado,
  execution/proposal de outro tenant, versão/hash mudada, aprovação concorrente.
- Casos de confiabilidade: evento duplicate, worker concurrency, crash em cada checkpoint,
  provider response sem checkpoint, Firestore outage, attempts >3, deadline excedido,
  relatório malformado e erro permanente.
- Tool registry não inclui Admin SDK genérico, escrita, arbitrary fetch, shell ou action
  executor. Nenhum efeito externo executado na primeira entrega.
