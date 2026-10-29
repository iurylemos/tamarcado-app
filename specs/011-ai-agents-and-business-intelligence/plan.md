# Plano de Implementação: Agentes de IA e Inteligência de Negócio

**Branch**: `011-ai-agents-and-business-intelligence` (planejada; não criada) |
**Data**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

**Entrada**: Revisão arquitetural aprovada para priorizar a infraestrutura Firebase
existente e não exigir novo serviço ou banco pago na primeira entrega.

**Status**: Smoke test T001 aprovado pelo responsável em 2026-10-28. Implementação da US2
autorizada para validação local; chamadas reais dependem do teto de gastos configurado pelo
responsável no workspace OpenRouter e não fazem parte dos testes automatizados.

## Resumo

A recomendação inicial passa a ser Firebase Cloud Functions v2 + Mastra em módulos
TypeScript isolados dentro do workspace `functions/` + Cloud Firestore. Uma callable
autenticada valida o usuário, deriva o tenant e cria uma execução `queued`; um trigger
Firestore `onDocumentCreated` processa a execução de forma assíncrona. O Backoffice consulta
estado e histórico somente por callables. As coleções de IA permanecem server-only e
deny-by-default.

O Functions mantém a autoridade sobre autorização, tenant, métricas e persistência de
negócio. O runner inicial será um orquestrador TypeScript determinístico, com checkpoints
explícitos no Firestore e chamadas a agentes/tools Mastra isoladas por etapa. A execução em
memória do Mastra não será tratada como workflow retomável. O engine nativo de workflows
Mastra só será usado se o smoke test comprovar compatibilidade com esse modelo de retomada.
Se compatibilidade, reconstrução ou limites não forem comprovados, não implementar o fluxo
até revisar a arquitetura.

Cloud Run, Cloud Tasks e PostgreSQL não são dependências da primeira fase. Serão comparados
individualmente como opções futuras, com custo, quota e benefício registrados. A primeira
entrega não executa ações externas: somente cria, apresenta, aprova ou rejeita propostas
vinculadas ao tenant, usuário, versão e hash exatos.

## Contexto técnico

**Linguagem/versões**: TypeScript 6, Node.js 24 e Firebase Functions 2nd gen. O
`firebase.json` fixa `nodejs24`; o workspace Functions compila usando `NodeNext`. A raiz do
monorepo é ESM, mas `functions/package.json` não declara `"type": "module"`. Compatibilidade
efetiva do Mastra e do output do workspace depende do smoke test, não apenas do mínimo de
runtime documentado.

**Dependências principais**: `firebase-functions@^7.4.0`, `firebase-admin@^14.5.0`, Vitest,
Mastra e Tavily estão instalados em `functions/`. O modelo selecionado para síntese é
`openai/gpt-4o` via OpenRouter (`openrouter/openai/gpt-4o` no roteador Mastra). As chaves
permanecem em Firebase Secrets; os testes usam mocks e não leem credenciais. Os módulos de IA
ficam isolados em `functions/src/ai/` e usam os serviços e autorização existentes.

**Armazenamento**: Firestore é o armazenamento principal e único de execução, estado
consultável, checkpoints de etapa, relatório, proposta, aprovação, idempotência e falha
sanitizada. Checkpoints são registros da aplicação; não são snapshots internos do Mastra.
O orquestrador TypeScript reconstrói o fluxo a partir dos checkpoints e chama agentes/tools
Mastra em etapas; isso não restaura automaticamente o grafo/contexto interno do Mastra.
Snapshots nativos do Mastra só poderão ser usados se o smoke test confirmar suporte a um
backend permitido, durabilidade e compatibilidade sem infraestrutura adicional. Não
introduzir adapter Firestore próprio sem prova de necessidade e viabilidade.

**Execução assíncrona**: Callable cria execução e retorna após persistência. O evento
Firestore de criação aciona uma Function worker. O trigger é at-least-once e pode ser
redeliverado; claim transacional, lease/fencing token, estado por etapa e idempotência tornam
o processamento seguro. O runner TypeScript verifica checkpoints e invoca a etapa Mastra
seguinte, sem assumir restauração de estado interno. Estado `running` abandonado não é
considerado retomado até um novo invocation validar o checkpoint e continuar.

**Limites iniciais propostos para validação**:

- Function worker: timeout de plataforma `540 s` (máximo documentado para evento v2);
  deadline de projeto de `420 s` (7 min) desde o início da execução. Sete minutos é um
  limite de projeto a validar, não garantia do Mastra nem promessa de conclusão de qualquer
  workflow. O worker deve encerrar antes do deadline e registrar `timed_out`.
- Etapas: métricas Firebase até `30 s`; uma pesquisa Tavily até `20 s` por tentativa; uma
  geração LLM até `60 s` por tentativa. Respeitar também o deadline total. Falha de etapa
  que ultrapasse seu orçamento é classificada antes do limite total.
- Retries do workflow: no máximo duas novas tentativas por etapa (três chamadas totais),
  somente para falha transitória que o provider indica como não aceita (por exemplo,
  conexão não estabelecida ou HTTP 429 explícito com `Retry-After` dentro do orçamento).
  Backoff limitado de `1 s`, depois `2 s`, com jitter. Timeout ou 5xx ambíguo depois do envio
  não é repetido sem suporte de idempotência do provider, pois pode duplicar cobrança.
- Redelivery do trigger: contabilizar invocations em transação e, depois de três invocations
  de processamento, gravar falha terminal e retornar sucesso para parar retries. O retry
  Eventarc/Functions pode persistir por até 24 horas; se o Firestore estiver indisponível e
  não for possível gravar o terminal, o retry da plataforma não pode ser instantaneamente
  limitado pela aplicação. Consultas devem apresentar como expirado um estado que excedeu
  seu deadline mesmo quando a atualização terminal aguarda recuperação.
- Concorrência/custo: configurar `maxInstances: 1` e `concurrency: 1` inicialmente, se
  suportado pelo trigger e confirmado no build/runtime; além disso, permitir no máximo uma
  execução ativa por tenant via claim transacional. Não configurar `minInstances`.
- Provider/saída: um search Tavily limitado a três resultados, uma geração LLM por execução
  com saída máxima de 1.024 tokens e resposta estruturada estrita. O responsável configura
  o teto monetário no workspace OpenRouter; uma recusa por limite encerra a análise sem
  relatório parcial e o Backoffice mostra erro seguro. A aplicação não estima custo quando o
  provider não o fornece; uso desconhecido é `unavailable`, nunca zero.

Os números são limites de projeto conservadores para o smoke test e a primeira versão; devem
ser reduzidos se billing/quotas ou latência exigirem. Aumentá-los requer nova revisão e
aprovação de custo.

**Testes**: Vitest em Functions e frontends; Firebase Emulator Suite para callables,
Firestore e regras; mocks determinísticos de Tavily/LLM; smoke test não produtivo para
runtime, import/module system, trigger, interrupção, recuperação e duplicação de chamadas.
O emulator não prova garantias de entrega/retry/timeout da plataforma real.

**Plataforma alvo**: Functions v2 em `southamerica-east1`, runtime Node 24, Firestore
existente e Backoffice atual. Continuidade do billing account, quota disponível, egress e
custos por região devem ser conferidos. “Sem nova infraestrutura” não significa custo zero:
Functions, Firestore, Tavily e LLM podem gerar cobrança conforme uso e configuração.

**Restrições**: não confiar em `tenantId` ou permissões de frontend/LLM; nenhuma leitura
genérica do Firestore pelo agente; sem PII para provider; sem ferramentas de escrita/ações;
nenhuma migração, deployment ou alteração de produção. Aprovação humana é transacional e
vinculada ao hash canônico e versão da proposta. Desativar a feature não pode afetar
autenticação, disponibilidade ou booking.

## Comparação de infraestrutura

| Opção                                           | Custo e quotas                                                                                                                                                                                                                                                                                                                                                                                              | Benefícios                                                                                                                         | Trade-offs e decisão                                                                                                                                                                                                                                                    |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Functions v2 + Mastra isolado + Firestore**   | Reutiliza infraestrutura e regras de billing atuais; pricing oficial lista quotas mensais sem custo de até 2M invocações, 400K GB-s, 200K CPU-s e 5 GB de egress para Functions, sujeitas a região/uso do billing account. Firestore tem quotas gratuitas documentadas para uma database elegível, mas leituras/escritas/armazenamento/rede excedentes são cobrados. Worker por evento tem máximo de 540 s. | Menor quantidade de serviços e menor overhead operacional; autorização, métricas e dados permanecem junto ao backend já confiável. | Selecionada como primeira fase. Inclui `maxInstances/concurrency` limitados, checkpoints explícitos, tentativas limitadas e smoke test de recuperação. Quotas já são compartilhadas com o resto do projeto; teto de 7 min é hipótese a validar.                         |
| **Cloud Run sem Cloud Tasks/PostgreSQL**        | Cobrança por CPU/memória/tempo, com free tier e escala sob demanda conforme configuração/região. Não requer banco dedicado para iniciar, mas durabilidade ainda precisa de mecanismo próprio.                                                                                                                                                                                                               | Isola serviço/dependências e permite request até 60 min; pode ser útil se Functions não suportar runtime/módulos ou latência alvo. | Alternativa futura para worker isolado. O request 504 não garante cancelamento do processo. Ainda exige auth e estado confiável no Firestore. Não provisionar nesta fase.                                                                                               |
| **Cloud Tasks / Firebase Task Queue Functions** | Cloud Tasks cobra por operações/entregas; a página oficial consultada informa primeiro milhão de operações mensal gratuito por conta, depois cobrança por milhão, além de custos regulares de rede. `onTaskDispatched` tem timeout máximo documentado de 1800 s e depende de Cloud Tasks.                                                                                                                   | Fila gerenciada, rate limits, retries e dispatch explícitos; melhor isolamento de picos e execução acima do limite de eventos.     | Não é requisito da primeira entrega. Considerar quando retry/delivery do trigger Firestore ou throughput virar gargalo, após estimativa e aprovação. Evitar confundir Task Queue Functions com execução sem custo/serviço Cloud Tasks.                                  |
| **PostgreSQL gerenciado para snapshots Mastra** | Cloud SQL PostgreSQL é cobrado por vCPU/memória, storage e opções como HA/backup; pode criar custo recorrente enquanto provisionado. Preço depende de região e tamanho.                                                                                                                                                                                                                                     | Storage persistente nativo do Mastra para snapshots completos e retomada do próprio workflow.                                      | Não selecionado e sem necessidade demonstrada para a primeira fase. Firestore mantém checkpoints da aplicação. Considerar apenas se o smoke test provar que a recuperação necessária depende de snapshots Mastra indisponíveis com Firestore e após orçamento aprovado. |
| **Cloud Run + Cloud Tasks + PostgreSQL**        | Soma custos dos três serviços, chamadas de IA e Tavily.                                                                                                                                                                                                                                                                                                                                                     | Isolamento, filas/retries gerenciados e execução/snapshots mais longos/duráveis.                                                   | Arquitetura futura de escala/complexidade, não recomendada enquanto não houver volume, orçamento e necessidade técnica demonstrados.                                                                                                                                    |

Fontes oficiais, versões consultadas e ressalvas estão em [research.md](./research.md).
Nenhum serviço gerenciado é considerado “gratuito garantido”; quotas gratuitas dependem de
conta, localização e uso atual.

## Verificação da Constituição

### Gate pré-design: PASS

- **I–II. Integridade de domínio e booking**: IA não altera fluxo, disponibilidade,
  transação ou status de agendamento.
- **III. Segurança**: `authorizeActor` deriva actor/tenant no backend; todos os acessos a
  dados de negócio são filtrados no Functions. Firestore Admin SDK não obedece rules, então
  regras de aplicação explícitas continuam obrigatórias.
- **IV. Consistência financeira**: métricas existentes e definições da Spec 010 são
  reutilizadas; não criar totals duplicados nem inferir ocupação sem capacidade.
- **V. Testabilidade**: smoke test e casos de isolamento, recuperação, custo/retry e
  approval/hash são gates explícitos.
- **VI. Separação**: módulos de IA ficam isolados em `functions/src/ai/`; frontends não
  executam lógica de IA ou operações privilegiadas.
- **VII. UX**: UI mostra estado, falha, vazio, histórico e aprovação de forma acessível.
- **VIII. Simplicidade**: evita novo workspace/infra; checkpoint Firestore só persiste o
  estado de aplicação necessário, sem prometer snapshot completo Mastra.

### Gate pós-design: PASS COM BLOQUEIO DE SMOKE TEST

Não há exceção constitucional. A implementação só pode começar depois do smoke test
aprovar runtime/ESM, isolamento, recuperação com interrupção, limites/retries e chamadas
duplicadas/custo. Falha em qualquer critério de recuperação ou duração interrompe a
implementação e exige revisão arquitetural. Não converter a aprovação deste plano em
autorização para provisionar infraestrutura.

## Decisões de arquitetura

### D1 — Primeira fase no backend Firebase existente

Adicionar módulos dedicados em `functions/src/ai/`:

- `agents/`: agentes Mastra de síntese sem tools conectadas; o runner chama tools allowlisted;
- `workflows/`: definição/etapas de análise; o controle de estado durável fica no runner
  TypeScript da aplicação, não no estado em memória do engine Mastra;
- `tools/`: Tavily e consulta interna de métricas agregadas;
- `schemas/`: entrada/saída versionadas;
- `providers/`: adapter LLM isolado;
- `services/`: checkpoint/runner, limites, idempotência e integração com serviços
  existentes;
- `observability/`: sanitização e correlação alinhadas à Spec 008;
- `config/`: leitura de secrets e limites server-side.

Não separar dependências Mastra num serviço que lê Firestore diretamente. As ferramentas
internas chamam serviços de domínio TypeScript com argumentos derivados da execução
autorizada; não recebem collection name ou query livre. O runner determinístico valida e
persiste cada fronteira. O engine nativo de workflow Mastra é opcional e condicionado ao
smoke test; agents/tools podem ser invocados por etapas mesmo que o engine não ofereça
retomada adequada.

### D2 — Ciclo assíncrono e checkpoints Firestore

1. `startAnalysis` autentica callable e executa `authorizeActor(request, ['backoffice'])`.
2. Backend valida período/objetivo, deriva tenant/timezone, calcula idempotency key em
   escopo do actor, grava `queued` e devolve `executionId`.
3. `onDocumentCreated(ai_analysis_executions/{executionId})` com `retry: true` lê e valida
   documento e evento, então adquire lease/fencing token transacional.
4. Para cada etapa (métricas, pesquisa, geração, validação, persistência), gravar estado
   `running`/tentativas antes de operação e guardar saída mínima/serializável somente após
   conclusão. Antes de executar, reler checkpoint; se etapa `succeeded`, não repetir.
5. Se o processo cair entre resposta externa e gravação do checkpoint, a chamada pode ser
   repetida em delivery posterior. Incrementar e persistir contador antes da chamada,
   aplicar limite global de etapa e reportar uso tentado; não prometer exactly-once para
   provider.
6. Validar relatório deterministicamente e persistir `succeeded` atomically; somente então
   apresentar resultado. Erro permanente grava estado terminal sanitizado e a função retorna
   sucesso para encerrar retry da plataforma. Falhas transitórias elegíveis têm no máximo
   duas novas tentativas.
7. Uma redelivery usa o mesmo documento/run; compare-and-set, lease e eventos idempotentes
   rejeitam worker concorrente. Chave de execução/evento e `stageInputHash` evitam repetir
   trabalho já persistido.

**Limite fundamental**: Firestore registra checkpoints definidos pela aplicação. Isso não
reconstitui automaticamente contexto, estado interno ou grafo de execução serializado do
Mastra. Reiniciar significa recriar o runner TypeScript, carregar o checkpoint de cada etapa
e invocar apenas a próxima operação. O smoke test deve provar que os módulos Mastra podem ser
chamados dessa forma, que estado necessário é serializável e que não há dependência oculta
de contexto em memória. O uso do engine Mastra nativo requer prova própria de recuperação;
se falhar, permanecer com agents/tools Mastra e runner TypeScript se essa combinação passar.
Se nem essa combinação operar com segurança, interromper e reavaliar alternativas. Não
implementar custom storage adapter como atalho.

### D3 — Autorização e contratos

Backoffice usa callables autenticadas para criar/listar/consultar/analisar e aprovar/rejeitar.
Cada entrada é schema-validated e não aceita `tenantId` como autoridade. Functions deriva
tenant do usuário/documento e associa UID/tenant à execução; leituras de histórico consultam
somente tenant autorizado com paginação limitada.

Worker é uma Function interna, disparada por evento Firestore, sem endpoint de serviço para
serviço na fase inicial. As operações de workflow chamam módulos/serviços internos tipados e
validam `executionId`, tenant persistido, estado, owner, lease e período. Não expor acesso
genérico Admin SDK ao agente.

Revalidar autorização atual em consultas/aprovação e usar status/roles documentais
autoritativos. O worker só usa tenant que está no documento server-side criado pela callable;
payload/evento não define tenant ou ferramentas. Dados de metrics são reduzidos a agregados
minimizados antes de qualquer chamada ao LLM. Tavily recebe consulta pública sanitizada sem
tenantId, slug, métricas internas ou PII.

### D4 — Aprovação humana

Canonicalizar o payload permitido da proposta, calcular SHA-256 e armazenar
`proposalVersion` + `proposalHash`. Uma decisão exige usuário backoffice atual/autorizado,
tenant da execução, estado `pending_approval`, versão/hash apresentados e payload imutável.
Alterar proposta incrementa versão, calcula novo hash e invalida decisão em transação.
Concorrência usa compare-and-set transacional. A primeira entrega não executa ações, mesmo
quando aprovada; efeito futuro exigirá nova decisão de escopo e revalidação backend.

### D5 — Ferramentas e saída estruturada

O runner determinístico chama, em ordem fixa, a tool interna de métricas e a pesquisa Tavily;
o agente LLM não escolhe tools nem controla o fluxo. Tavily é limitada a uma pesquisa de
até três resultados; conteúdo público é evidência não confiável, limitado e nunca
instrução. O agente recebe somente agregados autorizados e fontes normalizadas, sem acesso
ao Firestore. Sem fetch arbitrário, shell, tool genérica, escrita ou aprovação. Métricas
internas são calculadas por Functions a partir de fontes autorizadas e definições da Spec 010.

Schema versionado valida relatório em Mastra e novamente em Functions antes de persistir.
Regras determinísticas verificam fontes, tipos de métrica, tamanho, execução, completude e
limitações; não repetir automaticamente saída inválida. Sem PII ou registros individuais.

### D6 — Falhas, timeouts e retries

- Estado execução: `queued -> running -> succeeded | failed | timed_out | cancelled`.
- Estado de etapa: `pending -> running -> succeeded | retryable_failed | failed | timed_out`.
- Tentativas persistidas atomicamente antes do provider call; máximo de três chamadas por
  etapa (inicial + duas novas), só em erros transitórios conhecidos.
- Backoff interno entre tentativas: 1s, 2s, jitter, interrompido pelo deadline de 420 s.
- Evento de Firestore pode redeliverar at-least-once; contador de invocation e terminal guard
  limitam trabalho. O retry da plataforma pode durar até 24 h; erros não transitórios são
  capturados e finalizados, não lançados. Persistência indisponível pode impedir o contador;
  nesse caso as tentativas da plataforma seguem até seu retry window. `getAnalysis` apresenta
  timeout efetivo após deadline.
- Não repetir chamada externa após timeout ambíguo se provider pode ter aceitado a requisição,
  exceto quando chave de idempotência estiver documentada e suportada.
- Erros de autorização, entrada, política/schema, e tentativa acima do limite nunca são
  repetidos.
- Uma pesquisa e uma geração lógica por análise; retries de rede ficam dentro do limite da
  etapa. O agente não pode iniciar tool/model calls adicionais. Token e custo máximos serão
  aprovados depois de selecionar provider; negar início sem limite configurado.

### D7 — Observabilidade e custos

Functions usa `firebase-functions` logger e Cloud Logging estruturado; backoffice consulta
sumários do Firestore por execução. Usar telemetria/tracing nativo Mastra somente após provar
redação/desativação de prompts, conteúdo tool e payload; não introduzir Sentry backend nem
novo sink contra a Spec 008. Correlation ID opaco propagado do registro ao trigger, etapa e
provider. Registrar duração por etapa, invocation/attempts, resultado, classe de falha,
chamadas e tokens/custo quando reportados. Ausentes são `unavailable`. Falha de telemetria
não altera operação. Nunca logar secret, PII, prompt sensível ou página completa.

Controle de custo: cap de uma execução ativa por tenant; `maxInstances/concurrency` em 1;
limite por etapa e chamadas; no máximo três resultados Tavily; máximo de tokens obrigatório
após a seleção do modelo; feature flag/config de desligamento; métricas de Firestore reads/
writes consultadas antes da habilitação. Fazer estimativa de cenário com tarifas/quotas
vigentes. Sem orçamento aprovado para provider, Tavily e possível excedente de Firebase,
manter feature desativada.

## Estrutura proposta

```text
functions/src/
├── functions/ai-analysis/
│   ├── start-analysis.ts
│   ├── process-analysis-created.ts
│   ├── get-analysis.ts
│   └── review-proposal.ts
├── ai/
│   ├── agents/
│   │   └── business-insights.agent.ts
│   ├── workflows/
│   │   └── growth-analysis.workflow.ts
│   ├── tools/
│   │   ├── tavily-search.tool.ts
│   │   └── authorized-metrics.tool.ts
│   ├── providers/llm.provider.ts
│   ├── schemas/
│   ├── services/
│   │   ├── checkpoint.service.ts
│   │   ├── runner.service.ts
│   │   └── limits.service.ts
│   ├── observability/
│   └── config/
├── model/ai-analysis.model.ts
└── config/collections.ts            # somente novas coleções server-only aprovadas

backoffice/src/
├── services/ai-analysis.service.ts
├── pages/                           # rota/páginas conforme convenções atuais
└── test/

specs/011-ai-agents-and-business-intelligence/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/ai-analysis.md
```

Separar arquivos de módulos não implica permissões de segurança: Functions continua um
boundary server-side. Reusar serviços e tipos existentes sem mover regras de domínio para a
camada de IA.

## Fase de escala futura (fora do primeiro release)

- Cloud Tasks/Firebase Task Queue Functions: se volume, delivery/retry do Firestore ou
  throughput exceder capacidade validada; analisar preço, quotas, dedupe e custo por tentativa.
- Cloud Run: se duração/concurrency/dependências ou isolamento ultrapassar limites de
  Functions; calcular custos por região, configuração e free tier, e provar auth privada e
  cancelamento/deadline.
- Storage PostgreSQL compatível Mastra: somente se snapshots internos e recuperação não
  puderem ser atendidos pelo checkpoint explícito de Firestore, e orçamento/backup/retention
  forem aprovados.
- Maior concorrência, mais buscas/model calls, observabilidade externa, retenção automática
  com TTL pago e execução de ações aprovadas são decisões futuras com revisão própria.
- Nenhum desses itens pode ser pré-requisito oculto, provisionado ou habilitado na primeira
  fase.

## Critérios de aceitação e bloqueio

- **Smoke test obrigatório antes de implementação funcional**: Node 24 e output real do
  workspace Functions importam Mastra/Tavily/provider compatíveis em `NodeNext`; build e
  teste executam no Emulator e invocação worker de teste.
- **Interrupção/retomada**: interromper deliberadamente depois de cada checkpoint e antes/
  depois do provider response; a próxima invocation deve reconstruir usando Firestore,
  recuperar ou falhar explicitamente dentro do limite, nunca alegar retomada completa
  baseada somente em status `running`.
- **Duplicação e limite**: comprovar que eventos repetidos/concorrentes não duplicam
  execução, checkpoint, relatório, proposta ou efeito de negócio; chamadas externas
  ambíguas ficam limitadas e custo potencial duplicado fica observado.
- **Deadline**: teste end-to-end demonstra resultado terminal ou estado expirado antes de
  420 s; Function declara timeout máximo compatível `540 s`; falha significa revisar plano,
  não elevar limite automaticamente.
- **Retry**: no máximo duas novas tentativas por etapa para transient conhecido; testar
  erros permanentes, timeout ambíguo, 429/5xx e Firestore indisponível. At least once e retry
  window de 24 h ficam explícitos.
- **Multi-tenant**: fixtures com pelo menos dois tenants comprovam negação de acesso,
  listagem, métrica e decisão cruzados; frontend/LLM não determinam tenant.
- **Aprovação**: qualquer mudança, hash/versão antiga, outro tenant/ator ou corrida invalida/
  nega decisão; primeira entrega não chama executor de ação.
- **Privacidade/observabilidade**: nenhum PII, prompt sensível, token, chave ou conteúdo
  integral de pesquisa aparece em logs, traces, snapshots ou payload de provider.
- **Custos**: estimativa documentada inclui Functions, Firestore, Tavily e modelo; owner
  aprova limite do modelo e possível cobrança além das quotas Firebase antes de habilitar.
- **Bloqueio explícito**: se runtime/módulos, checkpoint/reconstrução, isolamento ou deadline
  não passar, parar antes de implementar o fluxo e revisar opções. As tasks podem incluir o
  smoke test como primeiro gate, com demais tasks condicionadas ao resultado. Possíveis opções:
  (1) Mastra agents/tools + orquestrador TypeScript explícito em Functions/Firestore;
  (2) orquestração TypeScript sem engine Mastra; (3) serviço/fila/store novos em fase futura
  após orçamento. Não provisionar alternativa automaticamente.

## Critérios para aprovação deste plano

- Confirmar Firebase Functions v2 + Firestore como arquitetura da primeira fase e aceitar
  que Cloud Run, Cloud Tasks e PostgreSQL são alternativas futuras opcionais.
- Aceitar a limitação de entrega at-least-once, o retry window da plataforma de até 24h e a
  possibilidade de chamada/custo duplicado após interrupção em fronteira não persistida;
  os limites internos reduzem, mas não eliminam essa incerteza.
- Aprovar os limites de projeto como teto provisório para o smoke test (420s total,
  540s platform, budgets por etapa, até 2 retries elegíveis), com o entendimento de que
  nenhum é garantia de retomada ou conclusão até passar nos testes.
- Exigir que a primeira task seja o smoke test de compatibilidade e recuperação; nenhuma
  implementação do workflow/backoffice deve iniciar se ele falhar.
- Definir/aceitar antes de habilitar usuários o provider LLM, limites de tokens/custo,
  política de retenção e o billing/quotas do projeto Firebase. Valores não confirmados não
  ficam presumidos como gratuitos.

## Incertezas para aprovação

- Provider/modelo LLM e seus limites de structured output, tokens, rate, privacidade e custo.
- Preço/quotas atuais do billing account, região de Functions, Firestore consumido por outros
  workspaces e excedente de uso.
- Compatibilidade de versão exata do Mastra com Node 24, TS6, `NodeNext`, build CommonJS/ESM
  real e runtime Functions; somente smoke test resolve.
- Como reconstituir input/context sem depender de workflow snapshot interno; validar
  serialização/tamanho e consistência do checkpoint.
- Política de retenção e mecanismo de limpeza: Firestore TTL é cobrado e exige billing;
  retenção deve ser aprovada antes de habilitar histórico.
- Segredos de Tavily/LLM e metering: confirmar Secret Manager já disponível e custos do
  provider. O serviço externo de IA continua potencialmente pago mesmo sem infra nova.
- Query de métricas autorizadas e cobertura concreta de occupancy/period comparison ainda
  devem ser demonstradas com dados sintéticos e sem valores inventados.

## Complexity Tracking

| Complexidade                     | Justificativa                                                                                                            | Alternativa mais simples rejeitada                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Mastra em Functions existente    | Reutiliza runtime, secrets, backend e deployment já mantidos, com módulos isolados.                                      | Novo serviço de execução é desnecessário sem comprovação de limite funcional ou escala.        |
| Checkpoints Firestore explícitos | Necessários para estado consultável e reconstrução controlada, sem confundir status de negócio com state interno Mastra. | Guardar só `running`/resultado final não recupera passo nem chamada interrompida.              |
| Trigger Firestore                | Usa recurso já existente para separar resposta callable do trabalho longo; entrega at-least-once será protegida.         | Execução síncrona torna callable dependente de duração de provider e não atende UX assíncrona. |
