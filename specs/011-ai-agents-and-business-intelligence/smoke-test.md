# Smoke Test T001: Compatibilidade e Recuperação

**Data**: 2026-10-28
**Status do gate**: APROVADO em 2026-10-28 pelo responsável do projeto, com as limitações abaixo. A aprovação não autoriza deploy, provisionamento ou alteração de produção; as limitações são critérios de validação antes da produção.

Ambiente não produtivo: Firestore Emulator local, projeto `demo-*`, sem secrets, sem chamadas a
LLM ou Tavily reais (Tavily aponta para um servidor HTTP local de mock).

## Versões

| Item | Versão |
|---|---|
| Node.js | v24.15.0 |
| npm | 11.12.1 |
| TypeScript | ~6.0.2 (`module`/`moduleResolution` NodeNext) |
| `@mastra/core` | 1.80.0 (engines `node >=22.13.0`; novo, adicionado a `functions/package.json`) |
| `@tavily/core` | 0.7.14 (novo, adicionado a `functions/package.json`) |
| `firebase-functions` / `firebase-admin` | ^7.4.0 / ^14.5.0 (existentes) |
| Vitest | 5.0.3 |

## Comandos e resultados

| Comando | Resultado |
|---|---|
| `npm install --workspace functions @mastra/core@1.80.0 @tavily/core@0.7.14` | OK (`npm audit` reporta 17 vulnerabilidades no grafo; não triadas) |
| `npm run build:functions` | OK (tsc NodeNext estrito + build do workspace, incluindo o harness) |
| `firebase emulators:exec` isolado (portas alternativas) + `vitest run src/ai/smoke/compatibility.spec.ts` | 5/5 passaram |
| `vitest run src/ai/smoke/compatibility.spec.ts` com `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` (emulador do usuário) | 5/5 passaram |
| `require` de `@mastra/core/agent`, `@mastra/core/tools`, `@tavily/core` sob Node 24 (CJS, como o artefato do workspace) | OK; `Agent` inicializa com tool; `tool.execute` retorna o agregado |

## Cobertura do harness (`functions/src/ai/smoke/compatibility.spec.ts`)

1. Import/inicialização Mastra `Agent` + `createTool` e Tavily sob Node 24/TS6/NodeNext: OK.
2. Worker `onDocumentCreated` v2 (`timeoutSeconds: 540`, `retry: true` confirmados no manifest)
   executado via `.run(event)`.
3. Checkpoint Firestore após a etapa; interrupção após o checkpoint; nova invocation reconstrói
   e conclui sem repetir a chamada ao provider mock (contador = 1).
4. Interrupção após resposta do provider e antes do checkpoint: tentativas persistidas antes da
   chamada, limite de 3; a 4ª invocation não chama o provider (contador = 3). Duplicação
   potencial de chamada fica explícita e limitada.
5. Concorrência/redelivery: lease + fencing token impedem processamento duplicado; evento
   repetido após terminal é no-op.
6. Deadline: execução com `deadlineAt` vencido vai para `timed_out` sem chamar provider.
7. Isolamento de dados no tool de métricas (tenant-a não soma linhas de tenant-b).

## Limitações (não comprovadas)

- O emulador/`.run()` não prova entrega at-least-once, retry de 24 h nem timeout reais da plataforma
  (exige staging autorizado).
- O `Agent` Mastra foi apenas inicializado; nenhuma geração (modelo mockado) foi executada.
  O plano usa agent/tool como componentes, e a tool foi executada isoladamente.
- O deadline de 420 s foi validado por relógio simulado, não por medição end-to-end de 420 s.
- Firestore indisponível não foi simulado.
- Build/carregamento do `firebase deploy` real do artefato não foi exercitado.
- Mastra 1.80.0 traz muitas dependências transitivas; impacto no tamanho/cold start do deploy não medido.

## Aprovação

- [x] Aprovado formalmente pelo responsável do projeto (usuário) em 2026-10-28, com as limitações registradas.
