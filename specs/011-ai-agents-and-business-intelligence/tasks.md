# Tarefas: Agentes de IA e Inteligência de Negócio

**Entrada**: `plan.md`, `spec.md`, `data-model.md`, `contracts/ai-analysis.md` e `quickstart.md`. `research.md` não foi usado.

**Organização**: tarefas agrupadas pelas histórias de usuário da especificação. Testes estão incluídos porque a especificação define critérios de teste independentes e o plano exige smoke test bloqueante.

## Fase 1: Setup — smoke test obrigatório

**Objetivo**: provar compatibilidade e recuperação antes de qualquer implementação funcional.

- [x] T001 Executar smoke test não produtivo em Node.js 24/TypeScript 6/NodeNext, no artefato real do workspace `functions/`, cobrindo import/build do Mastra e Tavily, execução de worker v2, checkpoints Firestore, interrupção/retomada, redelivery, concorrência, duplicação, retries e deadline; usar mocks, não chamar providers pagos, implementar o harness em `functions/src/ai/smoke/compatibility.spec.ts`, registrar versões, comandos, resultados e limitações em `specs/011-ai-agents-and-business-intelligence/smoke-test.md`; se runtime, reconstrução ou limites falharem, parar e revisar `specs/011-ai-agents-and-business-intelligence/plan.md` antes de T002

**Gate**: nenhuma tarefa funcional das fases seguintes começa sem aprovação registrada do T001. A aprovação não autoriza deploy, provisionamento ou alteração de produção.

## Fase 2: Fundacional

**Objetivo**: preparar os contratos, dados e controles compartilhados; depende da aprovação do T001 e bloqueia as histórias.

- [x] T002 [P] Definir tipos e transições da execução, etapas, métricas e propostas conforme o modelo aprovado em `functions/src/model/ai-analysis.model.ts`
- [x] T003 [P] Criar schemas versionados para entrada, agregados, fontes, relatório e proposta, com validação independente em cada fronteira confiável, em `functions/src/ai/schemas/analysis-input.schema.ts`, `functions/src/ai/schemas/metrics.schema.ts`, `functions/src/ai/schemas/report.schema.ts` e `functions/src/ai/schemas/proposal.schema.ts`
- [x] T004 Implementar coleções e regras Firestore server-only para execuções e propostas, com testes que confirmem negação de acesso pelo cliente, em `functions/src/config/collections.ts`, `firestore.rules` e `functions/test/ai-analysis.rules.spec.ts`
- [x] T005 Implementar checkpoints transacionais, lease/fencing, idempotência e limites compartilhados de invocação/etapa em `functions/src/ai/services/checkpoint.service.ts` e `functions/src/ai/services/limits.service.ts`

## Fase 3: História 1 — Solicitar análise autorizada (Prioridade: P1)

**Objetivo**: aceitar solicitações válidas, derivar tenant e período no backend, calcular somente métricas agregadas autorizadas e criar execução consultável.

**Teste independente**: com dois tenants e dados sintéticos, confirmar criação idempotente e métricas somente do tenant autorizado; negar ator sem permissão, entrada inválida e tentativa de impor outro tenant; conferir que ausência de dados não gera valores inventados.

### Testes da História 1

- [x] T006 [P] [US1] Testar autorização, validação de entrada, derivação de tenant e idempotência da callable `startAnalysis` em `functions/src/functions/ai-analysis/start-analysis.spec.ts`
- [x] T007 [P] [US1] Testar agregados autorizados, cobertura insuficiente e isolamento entre tenants em `functions/src/ai/tools/authorized-metrics.tool.spec.ts`
- [x] T008 [P] [US1] Testar envio de solicitação e retorno de estado `queued` no backoffice em `backoffice/src/pages/AIAnalysisPage.spec.tsx`

### Implementação da História 1

- [x] T009 [US1] Implementar consulta de métricas agregadas com filtros de tenant/período e definições existentes, sem dados individuais, em `functions/src/ai/tools/authorized-metrics.tool.ts`
- [x] T010 [US1] Implementar callable autenticada `startAnalysis`, validação do contrato, tenant/timezone server-side, deadline e criação idempotente da execução `queued` em `functions/src/functions/ai-analysis/start-analysis.ts`
- [x] T011 [US1] Implementar trigger `processAnalysisCreated` e runner determinístico para claim transacional, execução da etapa de métricas, checkpoints e estados terminais em `functions/src/functions/ai-analysis/process-analysis-created.ts` e `functions/src/ai/services/runner.service.ts`
- [x] T012 [US1] Integrar a callable ao serviço de análise do backoffice, sem aceitar tenant enviado pelo navegador como autoridade, em `backoffice/src/services/ai-analysis.service.ts`
- [x] T013 [US1] Criar interface acessível para iniciar análise e confirmar estado inicial, seguindo as rotas atuais, em `backoffice/src/pages/AIAnalysisPage.tsx` e `backoffice/src/router/index.tsx`

## Fase 4: História 2 — Consultar evidências e recomendações (Prioridade: P1)

**Objetivo**: produzir relatório estruturado que distingue métricas, fontes, inferências e incertezas, sem delegar ao modelo o fluxo, permissões ou escolha de ferramentas. Depende da História 1.

**Teste independente**: com métricas e pesquisa mockadas, validar fontes navegáveis, incertezas explícitas e rejeição de relatório incompleto/inválido; confirmar que conteúdo externo não altera instruções ou ferramentas permitidas.

### Testes da História 2

- [x] T014 [P] [US2] Testar limites, normalização, remoção de identificadores/URLs e conteúdo externo não confiável da pesquisa em `functions/src/ai/tools/tavily-search.tool.spec.ts`
- [x] T015 [P] [US2] Testar saída estruturada, evidências, incertezas e rejeição de resposta inválida em `functions/src/ai/workflows/growth-analysis.workflow.spec.ts`

### Implementação da História 2

- [x] T016 [US2] Implementar pesquisa Tavily sanitizada, com no máximo uma pesquisa e três resultados, orçamento de etapa e sem envio de PII ou métricas internas em `functions/src/ai/tools/tavily-search.tool.ts`
- [x] T017 [US2] Implementar adapter OpenRouter/GPT-4o com saída estruturada, teto de tokens e propagação segura de recusas por limite de gastos configurado no workspace do provider em `functions/src/ai/providers/llm.provider.ts`
- [x] T018 [US2] Implementar agente de síntese sem tools conectadas e schema versionado que classifique fatos, inferências, evidências e incertezas em `functions/src/ai/agents/business-insights.agent.ts` e `functions/src/ai/schemas/report.schema.ts`
- [x] T019 [US2] Implementar workflow de ordem fixa para métricas, pesquisa condicional, geração, validação determinística e persistência do relatório validado; propostas de ação pertencem à US4, conforme o contrato sem allowlist de ações em `functions/src/ai/workflows/growth-analysis.workflow.ts` e `functions/src/ai/services/runner.service.ts`
- [x] T020 [US2] Exibir relatório validado, métricas disponíveis/indisponíveis, fontes e limitações na interface de análise em `backoffice/src/pages/AIAnalysisPage.tsx`

## Fase 5: História 3 — Acompanhar execuções e consultar histórico (Prioridade: P2)

**Objetivo**: expor estado, histórico paginado e erros seguros somente no escopo autorizado; depende das Histórias 1 e 2.

**Teste independente**: consultar execuções concluídas, em andamento, expiradas e com falha de dois tenants; confirmar isolamento, paginação e ausência de saída parcial não validada.

### Testes da História 3

- [ ] T021 [P] [US3] Testar autorização, paginação e sanitização das consultas de execução e histórico em `functions/src/functions/ai-analysis/get-analysis.spec.ts`
- [ ] T022 [P] [US3] Testar apresentação de estados, histórico, vazio e falhas seguras em `backoffice/src/pages/AIAnalysisPage.spec.tsx`

### Implementação da História 3

- [ ] T023 [US3] Implementar callable `getAnalysis` com autorização atual, tenant derivado no backend, deadline efetivo e ocultação de relatórios parciais em `functions/src/functions/ai-analysis/get-analysis.ts`
- [ ] T024 [US3] Implementar listagem paginada de histórico por escopo autorizado e adicionar somente os índices Firestore necessários em `functions/src/functions/ai-analysis/list-analyses.ts` e `firestore.indexes.json`
- [ ] T025 [US3] Integrar consultas e paginação no serviço e na interface do backoffice, incluindo estados `queued`, `running`, `succeeded`, `failed`, `timed_out` e `cancelled`, em `backoffice/src/services/ai-analysis.service.ts` e `backoffice/src/pages/AIAnalysisPage.tsx`

## Fase 6: História 4 — Revisar propostas de ação (Prioridade: P2)

**Objetivo**: permitir aprovação/rejeição humana transacional vinculada à proposta exata; nenhuma ação ou efeito externo será executado nesta entrega. Depende da História 2.

**Teste independente**: aprovar e rejeitar propostas com atores/tenants distintos; negar versão/hash antigos, proposta alterada, ator sem permissão e corridas concorrentes; confirmar ausência de executor de ação.

### Testes da História 4

- [ ] T026 [P] [US4] Testar decisão transacional, autorização, tenant, versão/hash, concorrência e invalidação após alteração em `functions/src/functions/ai-analysis/review-proposal.spec.ts`
- [ ] T027 [P] [US4] Testar revisão acessível de propostas e apresentação do estado da decisão em `backoffice/src/pages/AIAnalysisPage.spec.tsx`

### Implementação da História 4

- [ ] T028 [US4] Implementar canonicalização e hash SHA-256 versionado do payload allowlisted da proposta em `functions/src/ai/services/proposal-hash.service.ts`
- [ ] T029 [US4] Implementar callable `reviewProposal` com revalidação de autorização, comparação transacional de tenant/status/versão/hash e registro de decisão em `functions/src/functions/ai-analysis/review-proposal.ts`
- [ ] T030 [US4] Integrar aprovação/rejeição de propostas no serviço e na página; não criar executor nem chamada de ação externa em `backoffice/src/services/ai-analysis.service.ts` e `backoffice/src/pages/AIAnalysisPage.tsx`

## Fase 7: História 5 — Operar com limites observáveis (Prioridade: P3)

**Objetivo**: permitir diagnóstico e controle de custo/uso com dados sanitizados, limites aprovados e desligamento seguro. Depende das Histórias 1 a 4.

**Teste independente**: exercitar sucesso, falhas de provider, timeout, retries, limites e feature desativada; confirmar correlação sem dados sensíveis e continuidade de autenticação/agendamentos.

### Testes da História 5

- [ ] T031 [P] [US5] Testar limites de retries, deadline, invocations, custo/uso indisponível e recusas por configuração em `functions/src/ai/services/limits.service.spec.ts`
- [ ] T032 [P] [US5] Testar redação de logs e correlação de etapas sem PII, segredos, prompts ou páginas integrais em `functions/src/ai/observability/analysis-logging.spec.ts`
- [ ] T033 [P] [US5] Testar feature desativada e regressão dos fluxos não relacionados de autenticação/agendamento em `functions/src/functions/ai-analysis/feature-disabled.spec.ts`

### Implementação da História 5

- [ ] T034 [US5] Implementar logs estruturados, correlation ID opaco, duração/etapa/tentativas e sanitização alinhada à Spec 008 em `functions/src/ai/observability/analysis-logger.ts`
- [ ] T035 [US5] Configurar limites server-side de invocações, tentativas, timeout, concorrência, resultados e feature flag sem ativar `minInstances` em `functions/src/ai/config/analysis.config.ts` e `functions/src/ai/services/limits.service.ts`
- [ ] T036 [US5] Implementar projeção de chamadas/tokens/custo com valores ausentes marcados como `unavailable`, sem fallback para zero, em `functions/src/ai/services/usage.service.ts`
- [ ] T037 [US5] Documentar configuração, segredos, limites, desativação, falhas, observabilidade, retenção e custo aprovado antes da habilitação em `specs/011-ai-agents-and-business-intelligence/quickstart.md`

## Dependências e ordem de execução

### Dependências das fases

- **Setup**: T001 é a primeira tarefa e o gate obrigatório. Se falhar, interromper e revisar o plano; não iniciar implementação funcional.
- **Fundacional**: depende da aprovação do T001 e bloqueia todas as histórias.
- **US1 (P1)**: depende do Fundacional.
- **US2 (P1)**: depende da US1, pois usa suas execuções, métricas e runner.
- **US3 (P2)**: depende das US1 e US2 para consultar estados e relatórios.
- **US4 (P2)**: depende da US2 para revisar propostas geradas; aprovação nunca autoriza execução nesta fase.
- **US5 (P3)**: integra limites e observabilidade das demais histórias; depende das US1–US4.
- Cloud Run, Cloud Tasks, PostgreSQL, execução de ações e alterações de produção ficam fora destas tarefas.

### Oportunidades paralelas

- Após T001, T002 e T003 podem ocorrer em paralelo; T004 e T005 dependem dos contratos fundacionais pertinentes.
- Dentro de cada história, tarefas de teste marcadas `[P]` podem ser preparadas em paralelo. A implementação permanece após os testes.
- Após a conclusão de US1, US2 pode começar; US3 e US4 não são paralelas entre si em termos de entrega, mas seus testes independentes podem ser preparados em paralelo após US2.
- Componentes em arquivos distintos podem ser divididos entre implementadores quando não houver dependência de contrato ou arquivo compartilhado; os pontos de integração permanecem sequenciais.

### Estratégia de implementação

1. Executar e aprovar T001; não avançar se compatibilidade, interrupção/retomada, isolamento ou deadline falhar.
2. Concluir o Fundacional e validar regras server-only.
3. Implementar US1 como primeiro incremento testável: solicitação autorizada e métricas agregadas.
4. Implementar US2 para completar o fluxo de análise com evidências/recomendações. Embora US1 seja o MVP incremental, a habilitação para usuários depende também dos limites e aprovações operacionais da US5.
5. Acrescentar histórico (US3), revisão humana sem executor (US4) e controles operacionais (US5); executar os critérios independentes antes de qualquer habilitação.

## Validação do formato

Todas as tarefas usam checkbox, ID sequencial `T001`–`T037`, marcador `[P]` somente quando paralelizáveis, rótulo `[USn]` nas histórias e caminhos explícitos dos arquivos afetados.
