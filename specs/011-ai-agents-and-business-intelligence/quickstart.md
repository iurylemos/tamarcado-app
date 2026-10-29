# Guia de Validação: Agentes de IA e Inteligência de Negócio

Executar somente em ambiente local/emulator ou projeto isolado não produtivo. Nada neste guia
autoriza deploy ou chamadas pagas.

## Pré-requisitos

- Node.js 24 e npm.
- Firebase Emulator Suite com projeto de demonstração e fixtures sintéticas de pelo menos
  dois tenants.
- Secrets reais não são necessários para os testes iniciais: Tavily e LLM devem ser mocks.
- O smoke test obrigatório de compatibilidade Mastra foi aprovado em 2026-10-28; isso não
  comprova entrega/retry reais da plataforma nem autoriza deploy.
- A geração usa OpenRouter com `openai/gpt-4o` e limite de 1.024 tokens de saída. Configure
  um teto de gastos no workspace OpenRouter antes de habilitar chamadas reais; recusas do
  provider resultam em falha segura da análise, sem persistir relatório parcial. Os testes
  automatizados não leem a chave nem fazem chamadas reais ao provider.

## Etapa 0 — Smoke test bloqueante

Antes do fluxo funcional, executar spike isolado/não produtivo para comprovar:

1. Import/build do Mastra candidato sob Node 24, TS6, `NodeNext` e artefato real do workspace
   Functions, sem expor ou carregar secret.
2. Inicialização/uso de agent e tools por uma Firebase Function v2; testar o engine nativo
   de workflow separadamente apenas se houver intenção de adotá-lo.
3. Separação de estado entre invocations concorrentes/instâncias quentes.
4. Checkpoint JSON no Firestore por etapa; matar a Function após checkpoints e confirmar que
   nova invocation recria runner e prossegue da próxima etapa concluída.
5. Simular crash após provider responder e antes de salvar checkpoint; confirmar contador,
   retry cap, duplicação potencial da chamada e contabilização de custo.
6. Duplicar eventos/concorrência e confirmar claim, lease e fencing impedem gravação dupla.
7. Medir a execução end-to-end com providers mockados: terminal ou estado efetivo `timed_out`
   antes de 420s; worker timeout configurado até 540s.
8. Se qualquer passo não passar, **parar a implementação funcional**; registrar limitação
   e revisar as alternativas no plano. Tasks podem especificar esse gate e condicionar as
   etapas posteriores. O emulator não substitui o smoke de
   plataforma em staging autorizado para entrega/retry real.

Resultado esperado do gate: nota versionada com Node/package versions, commands/outputs
sanitizados, APIs Mastra exercitadas, limites de duração e resultado da interrupção. Sem
credenciais ou payloads reais.

## Build e testes sem chamadas externas

Após aprovação do smoke e implementação:

```powershell
$env:FIRESTORE_EMULATOR_HOST='127.0.0.1:8080'
$env:GCLOUD_PROJECT='demo-ai-analysis-tests'
npm run test --workspace functions -- src/ai/smoke/compatibility.spec.ts src/ai/tools/tavily-search.tool.spec.ts src/ai/providers/llm.provider.spec.ts src/ai/workflows/growth-analysis.workflow.spec.ts src/ai/services/runner.service.spec.ts
npm run build:functions
npm test --workspace backoffice
npm run lint
npm run format:check
```

O comando acima usa um Firestore Emulator já iniciado em `127.0.0.1:8080` e não inicia outra
instância. Mocks devem ser default; nenhuma execução de teste deve acessar Tavily ou LLM real.
Para chamadas manuais reais, configure um teto de gastos no workspace OpenRouter e os secrets
no ambiente Firebase antes de habilitar o worker.

## Cenário 1 — Autorização e isolamento

1. Usuário backoffice ativo A inicia análise no Emulator com período válido.
2. Confirmar execução `queued` consultável antes do término do worker.
3. Incluir `tenantId` de B no request e confirmar rejeição/ignorância; conferir métricas
   somente de A.
4. Testar usuário sem auth, role colaborador, inativo e claims divergentes.
5. Consultar/listar execution de outro tenant.

**Esperado**: nenhum retorno cruzado; autorização é derivada no server; leitura cliente
direta das coleções de IA permanece negada.

## Cenário 2 — Checkpoints, redelivery e timeouts

1. Processar etapa de métricas e gravar output.
2. Injetar falha transient em Tavily ou LLM e conferir até duas novas tentativas elegíveis,
   backoff 1s/2s com jitter e contadores persistidos.
3. Forçar erro permanente/schema inválido e confirmar sem retry e terminal safe.
4. Encerrar worker em cada fronteira: antes da chamada, após provider responder, após
   checkpoint e antes do terminal final.
5. Redeliver evento e disparar invocations concorrentes com mesmos executionId.
6. Simular deadline ultrapassado e Firestore temporariamente indisponível.

**Esperado**: etapa concluída não é repetida; nova invocation reconstrói de checkpoint
validado; ambiguidades de provider não excedem três tentativas/calls e custo duplicado
potencial fica explícito; estado expirado não aparece como sucesso; Firestore indisponível
não produz falsa garantia de recuperação.

## Cenário 3 — Relatório e aprovação

1. Usar métricas agregadas e fontes sintéticas; validar saída schema-valid e saída inválida.
2. Confirmar relatório só é visível em `succeeded`; fontes são navegáveis e limitações
   explícitas.
3. Aprovar proposal de tenant A com versão/hash atual.
4. Repetir com hash/versão antiga, alteração de payload, outro tenant/usuário, conta
   inativa e requisições concorrentes.
5. Verificar que nenhuma execução de ação externa ocorre mesmo depois de aprovação.

**Esperado**: aprovação única por payload canônico exato; qualquer alteração invalida
decisão; primeira entrega apenas registra approval/rejection.

## Cenário 4 — Privacidade, limites e custo

1. Inserir fixtures com telefones, nomes, prompts de injection, secret sentinel e dados de
   cliente nas entradas/erros mockados.
2. Inspecionar logs, traces, checkpoints e requests ao provider de teste sem registrar
   conteúdo real.
3. Exercitar limite de 3 resultados de pesquisa, call caps, limite de tokens configurado e
   flag de desligamento.
4. Comparar chamadas/read/write de Firestore com a estimativa aprovada; simular excedente e
   provider indisponível.

**Esperado**: nada sensível cruza a fronteira; ausência de usage é indisponível; feature
desativada nega novas execuções e não afeta autenticação, disponibilidade ou booking.

## Critérios antes de habilitar

- Smoke test em Node 24 passa e prova checkpoint/reconstrução, idempotência, limite/retry e
  isolamento.
- Provider/modelo, limites de token/custo e termos de privacidade/retention aprovados.
- Custos e quotas agregadas de Functions/Firestore/Tavily/provider conferidos no billing
  owner; quotas gratuitas não são consideradas garantia.
- Retenção e limpeza definidas; TTL pago não é habilitado sem orçamento.
- Testes Emulator e contratos aprovados, observabilidade segura e feature flag de desligamento
  verificadas.
- Qualquer falha de retomada/duração bloqueia implementação/rollout até revisão da arquitetura.
- Deploy/produção exige autorização separada.
