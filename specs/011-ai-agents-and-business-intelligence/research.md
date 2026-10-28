# Pesquisa: Agentes de IA e Inteligência de Negócio

**Data da consulta**: 2026-10-28  
**Escopo**: revisão da arquitetura para priorizar Firebase Functions v2 e Firestore. Foram
consultadas documentações oficiais atuais. Nenhuma dependência ou serviço foi instalado,
provisionado ou alterado.

## Decisão recomendada

Começar com módulos TypeScript de Mastra dentro de `functions/`, Function callable para
iniciar e trigger Firestore v2 para execução assíncrona, com checkpoints explícitos da
aplicação em Firestore. Essa decisão depende de smoke test antes de implementação.

Documentação do Mastra declara suporte a Node.js `v22.13.0` ou posterior, portanto o requisito
mínimo de runtime inclui Node 24. Isso **não prova** que as versões selecionadas de Mastra,
tools, provider, TypeScript `NodeNext`, Firebase Functions/Admin SDK e o build efetivo deste
monorepo sejam interoperáveis. Tampouco prova recuperação de workflow em memória ou suporte
a snapshots Mastra no Firestore. Essas propriedades serão decididas pelo smoke test, não por
inferência da compatibilidade Node.

## Evidência do repositório

- `firebase.json` declara Functions runtime `nodejs24`.
- `functions/package.json` declara `firebase-functions@^7.4.0`, `firebase-admin@^14.5.0` e
  scripts de build/teste existentes.
- `functions/tsconfig.json` usa `NodeNext`; `functions/package.json` não declara
  `"type": "module"`, embora a raiz seja ESM.
- `authorizeActor` confirma autenticação, documento ativo e alinhamento de claims, role e
  tenant. `calculateSalesReport` recebe tenant já autorizado e consulta appointments com
  filtros de tenant/período. `firestore.rules` nega por padrão as coleções privadas.
- A Spec 010 fornece as definições e limites existentes de analytics e reporting.

Admin SDK contorna Firestore Security Rules; qualquer novo acesso do worker deve continuar
validando ator/tenant em código confiável. Não conceder ao agente capacidade genérica de
acesso ao Admin SDK.

## Runtime, execução e recuperação

### Firebase Functions v2

Fontes oficiais:

- [Runtime e configuração de Functions](https://firebase.google.com/docs/functions/manage-functions)
- [Quotas de Functions](https://firebase.google.com/docs/functions/quotas)
- [Retries de funções event-driven](https://firebase.google.com/docs/functions/retries)
- [Firestore triggers v2](https://firebase.google.com/docs/functions/firestore-events)
- [Firebase Functions Node SDK options](https://github.com/firebase/firebase-functions/blob/master/_autodocs/api-reference/options.md)

Documentação atual consultada informa:

- Node.js 24 é um runtime configurável para Functions e o repositório já escolhe esse runtime.
- Para Functions v2, duração máxima por invocação: **540 segundos para event-driven**,
  **1800 segundos para task queue/scheduled** e **60 minutos para HTTP/callable**. O worker
  Firestore escolhido tem máximo de 540 s; o plano usa 420 s como limite interno de projeto
  a validar, não como capacidade garantida do workflow.
- Entrega de evento é **at-least-once**. Retry fica desligado por default; com `retry: true`,
  o evento é tentado até sucesso ou expiração do retry window de **24 horas**, com backoff
  exponencial documentado entre 10 e 600 s. O Firestore trigger não oferece, na opção
  simples `retry: true`, limite da plataforma de exatamente três tentativas.
- Logo, limite de duas novas tentativas é aplicação-owned: contador transacional por
  invocation/etapa, incremento antes de chamadas e finalização terminal/no-op após o máximo.
  Se Firestore estiver indisponível antes do contador/estado ser persistido, o retry da
  plataforma pode continuar até 24h; consultas devem tratar execução que excede o deadline
  como expirada. Essa limitação precisa ser aceita e testada.
- `concurrency` e `maxInstances` são opções de runtime v2; a configuração inicial proposta é
  1/1 para conter concorrência e custo, sujeita à confirmação no tipo de trigger e ao
  smoke test.

Uma Function que simplesmente lança qualquer erro com retry habilitado pode continuar
rodando/reentregando por 24 horas. Erros permanentes devem ser capturados, salvos em estado
terminal e retornar sucesso ao trigger. Só erro transitório que não pôde ser resolvido pela
política interna deve usar retry de plataforma; contabilização persistente previne loops.

### Mastra e persistência de workflow

Fontes oficiais:

- [Mastra deployment/runtime](https://mastra.ai/docs/deployment/overview)
- [Mastra workflow snapshots](https://mastra.ai/docs/workflows/snapshots)
- [Mastra workflows overview](https://mastra.ai/docs/workflows/overview)
- [Mastra storage providers](https://mastra.ai/docs/storage)

Mastra documenta que:

- Runtime Node suporta `v22.13.0+`.
- Snapshots serializáveis guardam estado/saídas do workflow e dependem de storage configurado.
- A documentação lista stores próprios como libSQL, Upstash, PostgreSQL, OracleDB,
  MongoDB, D1 e DynamoDB; não foi confirmada implementação oficial de store Firestore.
- Workflows retomáveis carregam snapshot persistido; executar agente/workflow em processo
  não é, por si só, execução durable.

Decisão: primeira fase não depende de snapshot Mastra externo nem presume que Firestore
possa servir de store nativo. Um orquestrador TypeScript determinístico controla a máquina de
estados e persiste checkpoints por etapa (input fingerprint, estado, tentativas, output
minimizado, schema version e timestamps); Mastra fornece módulos de agent/tool por etapa.
Após interrupção, o código recria o runner e pula etapas cujos outputs estão persistidos e
validados. Isso é recuperação da aplicação, não restauração do contexto/grafo interno do
engine Mastra. O smoke test deve confirmar que os módulos escolhidos permitem invocação
isolada/reconstrução e serialização segura. O engine nativo Mastra só entra se provar
recuperação compatível; caso contrário, manter agents/tools e orquestrador TypeScript. Se
nem essa combinação passar, parar para nova decisão.

### Risco de duplicação/custo em chamadas externas

Tavily e LLM são chamadas externas e podem ser cobradas. Se o provider responder e a
instância cair antes de salvar o checkpoint, a redelivery pode repetir a chamada. Incrementar
o contador antes do request e limitar tentativas reduz, mas não garante exactly-once. Só usar
idempotency key quando provider documentar e implementar essa semântica. Não repetir timeout
ambíguo após envio sem essa garantia. O fluxo inicial não tem efeitos de negócio externos;
não há ação/campanha habilitada.

## Custo e quotas: comparação por serviço

### Functions v2 + Firestore (base selecionada)

- Firebase Functions é usage-based; pricing oficial indica limites/quotas e cobrança conforme
  invocações, compute, networking e deployment. Free usage, billing plan e custo real
  dependem do projeto/região e do uso agregado por todo o app. Não declarar custo zero só por
  reutilizar Functions.
- A página de pricing do Firebase consultada lista no-cost quota mensal para Cloud Functions
  de até 2M invocations, 400K GB-seconds, 200K CPU-seconds e 5 GB de outbound networking;
  após os limites há cobrança, com localização/região relevante. Cloud Build e Artifact
  Registry também têm limites no-cost próprios. Esses limites são compartilhados pelo
  projeto/billing e não provam que o uso existente deixe margem disponível.
- Firestore cobra reads, writes, deletes, index reads, storage e bandwidth. Documentação
  consultada lista quota gratuita (para uma database elegível): 1 GiB armazenado, 50k reads/
  dia, 20k writes/dia, 20k deletes/dia e 10 GiB outbound/mês. Excedentes são cobrados por
  localização. TTL deletes, backups, PITR e restore não têm free usage documentado e exigem
  billing.
- Como o projeto já usa Firestore/Functions, o custo incremental pode ser pequeno para
  volume baixo, mas depende de triggers, leituras de métricas, checkpoints e polling do
  histórico. `maxInstances:1`, concurrency 1, limites de chamadas e ausência de listeners
  desnecessários reduzem risco; orçamento precisa considerar uso existente do projeto.
- Cloud Functions deploy/build ainda pode exigir billing habilitado conforme políticas de
  Firebase. Verificar plano/conta antes do rollout; não é verificado pelo repo.

Fontes: [Firebase pricing](https://firebase.google.com/pricing),
[Firestore pricing](https://firebase.google.com/docs/firestore/pricing),
[Functions quotas](https://firebase.google.com/docs/functions/quotas).

### Cloud Run (futura alternativa independente)

- Cobrança por CPU/RAM/tempo e networking após free tier; serviço pode escalar sob demanda,
  mas deployment, imagem/logs e tráfego entram na conta. Não há custo mensal fixo obrigatório
  se configurado para escala a zero, porém não é garantido custo zero.
- Request timeout documentado vai até 60 minutos. Um 504 fecha a conexão e o container pode
  continuar executando; timeout do request não substitui deadline/checkpoint.
- Benefício: isolamento de dependências/escala, mais duração e releases separados. Não
  resolve persistência durable por si só.

Fontes: [Cloud Run pricing](https://cloud.google.com/run/pricing),
[request timeout](https://docs.cloud.google.com/run/docs/configuring/request-timeout).

### Cloud Tasks / Firebase Task Queue Functions (futura alternativa de fila)

- Firebase documenta que task queue functions usam Cloud Tasks. A página de pricing
  consultada informa operações de criação/API/entrega: até 1 milhão de operações/mês grátis
  por conta e US$0.40 por milhão depois, com payloads em blocos de 32 KB; network charges
  podem aplicar-se. Confirmar preço/currency/conta atual no calculator antes de uso.
- `onTaskDispatched` tem controls de retryConfig e rateLimits e limite de duração de 1800 s.
- Benefício: fila explícita, controle de throughput/retry e melhor isolamento de bursts.
  Trade-off: mais configuração/IAM e dependência de quota/billing; substituir trigger de
  Firestore não é necessário no MVP.

Fonte: [Cloud Tasks pricing](https://cloud.google.com/tasks/pricing),
[Firebase task queue functions](https://firebase.google.com/docs/functions/task-functions).

### PostgreSQL gerenciado (futuro apenas se demonstrado)

- Cloud SQL PostgreSQL cobra CPU/memória por hora e storage, com custos variáveis por região
  e opções HA/backups; instância persistente tende a adicionar custo-base ainda em baixo
  volume. Não pressupor free tier que cubra produção.
- Benefício técnico: adapter Mastra suportado para workflow snapshots e retomada nativa.
- Não há necessidade demonstrada para a primeira entrega: checkpoints de produto são pequenos
  e podem ser persistidos em Firestore. Postgres somente se smoke test comprovar que
  reconstrução por checkpoints não satisfaz confiabilidade e o owner aprovar custo/backup/
  retenção.

Fonte: [Cloud SQL pricing](https://cloud.google.com/sql/pricing).

### Tavily e provider LLM

Não fazem parte da infraestrutura Firebase e podem ser cobrados por uso, independentemente
de Functions/Firestore. Selecionar provider apenas após comparar preço, tokens, limites,
retenção, privacidade e idempotência. Chamadas repetidas após falha ambígua podem incorrer
em cobranças duplicadas. Não liberar análise real sem limite de chamadas/tokens/custo por
execução e aceite explícito do owner.

## Smoke test obrigatório antes de implementar o fluxo

Não adicionar dependências ao monorepo antes de a revisão aprovar o desenho e o spike local
ser autorizado. Em ambiente de teste isolado, provar:

1. Mastra e versões candidatas inicializam sob Node 24/TS6 e o sistema de módulos produzido
   pelo build real Functions.
2. Um agente/workflow mínimo com fake provider executa sem memória global compartilhada entre
   chamadas concurrent invocations e respeita os módulos/limites.
3. Cada etapa permite persistir dados JSON mínimos no Firestore e recomeçar o runner desde
   checkpoint depois de matar a execução deliberadamente entre etapas.
4. Evento duplicado e concorrente não repetem output persistido; a interrupção após provider
   response deixa explicitamente observável o risco de call repetida e contador impede
   exceder três chamadas totais.
5. Falhas transitórias repetem no máximo duas vezes com backoff; erro permanente não repete;
   timeout ambíguo não é repetido sem idempotency support.
6. Execução termina ou entra em estado efetivo `timed_out` até o deadline de 420 s; timeout
   de plataforma permanece em 540 s. Se não provar, não elevar o limite automaticamente.
7. Inputs/output são serializáveis e sanitizados; nenhum tenant cruzado, PII, prompt ou secret
   é persistido/logado/enviado.
8. Revalidar chamadas reais só após limites e orçamento aprovados; smoke inicial usa provider
   stub/mock para evitar custo.

**Falha no smoke test** bloqueia implementação funcional; tasks ainda podem especificar o
smoke test como gate inicial e condicionar tarefas posteriores. Alternativas a documentar
para nova decisão, sem provisionar: (a) manter Mastra somente em agents/tools e usar runner
determinístico TypeScript + Firestore; (b) substituir Mastra por orquestração TypeScript
própria sobre Functions; (c) avaliar Cloud Run + fila + store durable somente em fase futura
com orçamento. Não selecionar ou provisionar alternativa automaticamente.

## Fontes oficiais consultadas

- [Mastra deployment overview](https://mastra.ai/docs/deployment/overview)
- [Mastra workflow snapshots](https://mastra.ai/docs/workflows/snapshots)
- [Mastra workflow overview](https://mastra.ai/docs/workflows/overview)
- [Mastra storage](https://mastra.ai/docs/storage)
- [Firebase Cloud Functions: manage functions](https://firebase.google.com/docs/functions/manage-functions)
- [Firebase Cloud Functions: quotas](https://firebase.google.com/docs/functions/quotas)
- [Firebase Cloud Functions: retries](https://firebase.google.com/docs/functions/retries)
- [Firebase Cloud Functions: task queue functions](https://firebase.google.com/docs/functions/task-functions)
- [Firebase Firestore triggers v2](https://firebase.google.com/docs/firestore/enterprise/extend-with-functions-2nd-gen)
- [Firebase pricing](https://firebase.google.com/pricing)
- [Cloud Firestore pricing](https://firebase.google.com/docs/firestore/pricing)
- [Cloud Run pricing](https://cloud.google.com/run/pricing)
- [Cloud Run request timeouts](https://docs.cloud.google.com/run/docs/configuring/request-timeout)
- [Cloud Tasks pricing](https://cloud.google.com/tasks/pricing)
- [Cloud SQL pricing](https://cloud.google.com/sql/pricing)
- [Tavily Search API](https://docs.tavily.com/api-reference/endpoint/search)
- [Spec 008 — Observabilidade](../008-observability-and-logs/spec.md)
- [Spec 010 — Analytics por empresa](../010-client-analytics-ssr/spec.md)
- [Constituição](../../.specify/memory/constitution.md)
