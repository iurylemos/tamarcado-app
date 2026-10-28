# Modelo de Dados: Agentes de IA e Inteligência de Negócio

Modelo lógico de planejamento; não cria coleções nem altera rules. A primeira fase usa
somente Firestore já existente e documentos raiz server-only. O estado nesta camada é
checkpoint de aplicação, não snapshot nativo do Mastra.

## Princípios

- O tenant é derivado no Functions por `authorizeActor` e persistido na criação. `tenantId`
  recebido do cliente, evento ou LLM nunca é autoridade.
- `executionId`, `proposalId`, `correlationId` e IDs de evento são opacos e não são
  credenciais.
- Nenhuma PII, linha individual de appointment, prompt privado, segredo ou conteúdo integral
  de página é persistido em relatório, checkpoint, log ou enviado ao modelo/pesquisa.
- Período usa timezone IANA da empresa resolvido no backend; valores monetários usam centavos
  inteiros e definições de métrica da Spec 010.
- Limite de tamanho de relatório/fontes/checkpoints fica abaixo dos limites de documento do
  Firestore. TTL/limpeza e retenção precisam de aprovação de custo e privacidade.

## Fontes atuais

### `users`

`authorizeActor` valida identidade Firebase, documento ativo, role e tenant/claims. Consultas
de histórico e approvals revalidam ator/escopo vigente; execução antiga não confere
autorização permanente.

### `tenants`

Resolver timezone e configuração no Functions. Não aceitar timezone do navegador ou do LLM.

### `appointments` e Spec 010

Usar filtros de `tenantId` e período e cálculos autorizados existentes. A tool retorna apenas
agregados mínimos e metadados de cobertura; não passa telefone, customer name, IDs de
appointment, collaborator name ou documento individual ao modelo. Métricas que dependam de
capacidade/schedule completa permanecem indisponíveis até sua cobertura ser comprovada.

## `ai_analysis_executions` (server-only)

Um documento por execução deduplicada.

| Campo | Tipo | Regra |
|---|---|---|
| `tenantId` | string | Obrigatório; escrito pelo Functions a partir de actor autorizado |
| `requesterUid` | string | UID para autorização/auditoria; não enviado a IA |
| `executionId` | string/document ID | Opaque, gerado pelo servidor |
| `idempotencyKeyHash` | string | Hash de chave escopada a actor/tenant; não guarda material secreto |
| `request` | object | objetivo sanitizado, período, timezone resolvido, versão do schema |
| `status` | enum | `queued`, `running`, `succeeded`, `failed`, `timed_out`, `cancelled` |
| `workerInvocationCount` | integer | Incremento transacional antes do trabalho; máximo de 3 invocations processadoras |
| `workflowRunId` | string | Estável para correlação; não prova acesso |
| `correlationId` | string | Opaco e gerado pelo backend |
| `lease` | object | owner opaco, `expiresAt`, `fencingToken` crescente |
| `activeStage` | enum | `metrics`, `research`, `generation`, `validation`, `persist`, terminal |
| `stages` | map | Estado/attempts/input hash/output mínimo/horários por etapa |
| `metrics` | object | Projeção agregada mínima validada; sem identificadores individuais |
| `researchSources` | object[] | título/URL/snippet limitados e validados; sem página integral |
| `report` | object | Apenas em `succeeded`, schema versionado e validado |
| `proposalIds` | string[] | Referências para proposals do mesmo tenant |
| `usage` | object | contagem de calls/tokens/custo disponível; unknown como `unavailable` |
| `failure` | object | código/etapa/categoria safe e `retryable`; sem mensagem bruta |
| `createdAt`, `startedAt`, `completedAt` | timestamp | Backend timestamp |
| `deadlineAt` | timestamp | `createdAt + 420s` para limite de projeto, validado em smoke |
| `durationMs` | integer/map | Total e por etapa, não negativo |
| `expiresAt` | timestamp opcional | Retenção aprovada; não ativar TTL antes da análise de cobrança |

### Checkpoint de cada etapa (`stages.<stage>`)

| Campo | Tipo | Regra |
|---|---|---|
| `status` | enum | `pending`, `running`, `succeeded`, `failed`, `timed_out` |
| `attemptCount` | integer | Incrementado transacionalmente antes de cada chamada; máximo 3 |
| `inputHash` | string | Hash da entrada allowlisted/schema version para invalidar checkpoint incompatível |
| `output` | object/string limitada | Persistido após etapa concluída; somente conteúdo necessário à próxima etapa |
| `startedAt`, `completedAt` | timestamp | Usados para duração e detecção de stale |
| `errorCode` | enum opcional | Categoria sanitizada, sem payload/provider raw |

Orquestrador TypeScript valida version/hash do checkpoint, reusa output `succeeded` e chama
somente a etapa ainda não concluída, usando agent/tool Mastra como componente. Isso não
representa snapshot completo do Mastra nem restaura o estado interno do engine Workflow. Se
os módulos Mastra não permitirem invocação/reconstrução isolada e segura, o smoke test falha
e implementação fica bloqueada.

**Transições**: `queued -> running -> succeeded|failed|timed_out|cancelled`. Mudanças de
estado/lease/fencing são transacionais. Apenas `succeeded` expõe relatório. Após deadline,
`getAnalysis` retorna estado efetivo timed_out se o worker não concluiu; a resposta não expõe
partial report como sucesso.

## `ai_analysis_proposals` (server-only)

Uma proposta mutável com versão monotônica; versão anterior não permanece aprovada após
mudança.

| Campo | Tipo | Regra |
|---|---|---|
| `tenantId` | string | Copiado da execução, server-side |
| `executionId` | string | Deve apontar execução do mesmo tenant |
| `proposalId` | string/document ID | Opaque |
| `proposalVersion` | integer | Incrementa em qualquer mudança |
| `canonicalPayload` | object | Ação allowlisted, parâmetros, justificativa e evidências |
| `proposalHash` | string | SHA-256 de canonicalização versionada feita no backend |
| `status` | enum | `draft`, `pending_approval`, `approved`, `rejected` |
| `decision` | object opcional | decisão, actorUid, timestamp, versão/hash exatos |
| `createdAt`, `updatedAt` | timestamp | Backend timestamp |

`executing/completed/failed` ficam fora da primeira implementação. Nenhum executor de ação
externa está habilitado. Aprovação exige papel/tenant atuais e status/versão/hash iguais;
alteração invalida decisão em transação.

## Coleções e regras

- Novas coleções raiz recebem regra explícita `allow read, write: if false` para clientes;
  Firebase Admin acessa somente após validação de domínio/authorization no Functions.
- Histórico exige tenant derivado no backend, paginação por cursor e máximo aprovado.
- Idempotência de `startAnalysis`: transaction cria/resolve uma execução por actor, tenant e
  chave; campos de input conflitantes não reutilizam a execução.
- Idempotência de trigger: lease e fencing token bloqueiam workers concorrentes; evento
  repetido lê checkpoints/terminal e não refaz etapas finalizadas.
- Provider calls usam attempt counter antes da chamada. Exactly-once não é prometido quando
  falha ocorre após resposta externa e antes do checkpoint; retries limitados e não repetir
  timeout ambíguo reduzem custo duplicado.
- Uso de TTL requer billing e política aprovada; se sem orçamento, não criar TTL como
  mecanismo obrigatório. Definir retenção e limpeza antes de habilitar histórico real.
