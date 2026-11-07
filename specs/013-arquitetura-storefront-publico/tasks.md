# Tarefas: Storefront público Vite + React SSG

**Entrada**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md),
[data-model.md](data-model.md), [contrato](contracts/storefront.md) e
[quickstart.md](quickstart.md).

**Execução**: T001–T015 implementadas exclusivamente no projeto `client`.
US2/US3 permanecem fora do escopo. A suíte do cliente passou; o type-check
continua bloqueado por erros em dois testes preexistentes. Não fazer deploy de
produção sem autorização explícita adicional.

## Fase 1 — Setup

- [X] T001 Promover o `react-router-dom` já existente para dependências de produção em `client/package.json` e atualizar `package-lock.json`, sem adicionar bibliotecas.

## Fase 2 — Fundamentos

**Objetivo**: obter apenas a lista de empresas autorizadas com isolamento e
validação antes de gerar qualquer página.

- [X] T002 [P] Adicionar testes para a leitura do snapshot publicado em `client/scripts/public-business-snapshot.spec.ts`, cobrindo somente `public_businesses` com `published == true` e ausência de consultas de produtos/profissionais.
- [X] T003 Implementar a leitura e projeção mínima dos cadastros publicados em `client/scripts/public-business-snapshot.ts`, validando `slug` com `^[a-z0-9]+(?:-[a-z0-9]+)*$`, `name`, `segment`, `tenantId` interno e unicidade antes de retornar o snapshot.

**Checkpoint**: a leitura isolada e sua projeção estão testadas; histórias podem começar.

## Fase 3 — US1: Abrir, compartilhar e navegar entre páginas (P1) 🎯 MVP técnico

**Objetivo**: gerar HTML e metadados individuais por catálogo e trocar páginas sem reload.

**Teste independente**: dois slugs publicados geram HTML e metadados próprios;
raiz neutra; catálogo → agendamento e volta funcionam com URL e histórico sem
navegação de documento e sem repetir leituras já cobertas pelo cache.

### Testes da US1

- [X] T004 [P] [US1] Adicionar testes em `client/src/entry-server.spec.tsx` para raiz neutra, metadados de dois slugs, escape HTML/JSON e isolamento entre tenants.
- [X] T005 [P] [US1] Adicionar testes em `client/scripts/generate-storefront.spec.ts` para geração da raiz, duas páginas de empresa e `booking-shell.html` vazio, sem consultas de produtos/profissionais.
- [X] T006 [P] [US1] Adicionar testes de navegação SPA e histórico em `client/src/app/StorefrontNavigation.spec.tsx`, verificando links internos, voltar/avançar e ausência de navegação de documento.
- [X] T007 [P] [US1] Adicionar testes em `client/src/pages/BookingPage.spec.tsx` verificando reaproveitamento da empresa/produto já carregados e ausência de consulta equivalente repetida ao abrir booking.

### Implementação da US1

- [X] T008 [US1] Estender `client/src/app/page-meta.ts` para canonical absoluto baseado em `VITE_PUBLIC_SITE_URL` (fallback ao domínio Firebase Hosting configurado), `og:url` e metadados próprios por empresa.
- [X] T009 [US1] Implementar o gerador em `client/scripts/generate-storefront.mts` para renderizar raiz neutra, HTML por slug e `booking-shell.html` a partir do template Vite e do renderer React existentes.
- [X] T010 [US1] Integrar o build SSG em `client/package.json` e `client/vite.config.ts`, garantindo que a geração ocorra após os bundles necessários e falhe sem promover snapshot parcial.
- [X] T011 [US1] Integrar React Router com `BrowserRouter` e as rotas atuais em `client/src/app/StorefrontApp.tsx`, `client/src/app/routes.ts` e `client/src/entry-client.tsx`, hidratando páginas SSG e montando o shell vazio.
- [X] T012 [US1] Substituir links internos por `Link` do router em `client/src/components/templates/CompanyCatalogTemplate/CompanyCatalogTemplate.tsx`, `client/src/components/templates/BookingTemplate/BookingTemplate.tsx`, `client/src/components/organisms/BookingReady/index.tsx` e `client/src/pages/ErrorPage.tsx`; preservar links externos nativos.
- [X] T013 [US1] Atualizar título e metadados do documento nas transições SPA em `client/src/app/Layout.tsx` ou no helper de metadados existente, sem alterar os metadados estáticos gerados por empresa.
- [X] T014 [US1] Reutilizar dados de catálogo/produto e manter um `QueryClient` durante navegações em `client/src/pages/CompanyCatalogPage.tsx`, `client/src/pages/BookingPage.tsx` e `client/src/config/query-client.config.ts`, consultando apenas dados existentes que ainda não estejam disponíveis.
- [X] T015 [US1] Remover rewrites de `renderStorefront` e configurar em `firebase.json` um rewrite limitado às rotas profundas de agendamento para `booking-shell.html`, sem fallback global para catálogos ausentes.

**Checkpoint**: raiz e catálogos têm HTML estático; links profundos abrem o shell;
navegação e histórico funcionam sem recarga completa.

## Fase 4 — US2: Distinguir ausência de falha (P1)

**Objetivo**: retornar 404 estático para catálogo ausente e exibir estados corretos
no cliente para dados inválidos/indisponíveis em booking.

**Teste independente**: slug de catálogo inexistente retorna 404; rota profunda
retorna o shell estático 200; produto inválido e falhas são estados acessíveis
distintos, sem dados de outro tenant ou invocação da Function.

### Testes da US2

- [ ] T016 [P] [US2] Adicionar testes em `client/scripts/public-business-snapshot.spec.ts` para slug malformado, duplicidade, campos obrigatórios inválidos, documento não publicado e falha da fonte.
- [ ] T017 [P] [US2] Cobrir produto inexistente, falha de leitura e indisponibilidade em `client/src/pages/BookingPage.spec.tsx`, incluindo estado de retry acessível e ausência de dados de outro slug.

### Implementação da US2

- [ ] T018 [US2] Fazer o build falhar explicitamente em `client/scripts/public-business-snapshot.ts` e `client/scripts/generate-storefront.mts` diante de origem indisponível, slugs duplicados ou registros inconsistentes, sem registrar dados sensíveis.
- [ ] T019 [US2] Ajustar estados de produto inexistente, indisponibilidade e erro em `client/src/pages/BookingPage.tsx` e `client/src/components/templates/BookingTemplate/BookingTemplate.tsx`, preservando validação e criação autoritativas existentes.
- [ ] T020 [US2] Validar no Firebase Hosting Emulator e registrar em `specs/013-arquitetura-storefront-publico/quickstart.md` o 404 de catálogo ausente, shell 200 nas rotas profundas e zero invocações de `renderStorefront`.
- [ ] T021 [US2] Confirmar em `client/src/app/routes.spec.ts` o tratamento de rotas malformadas/desconhecidas e correspondência exata de slug/produto sem fallback entre tenants.

**Checkpoint**: ausência e falha são distinguíveis conforme o contrato aprovado.

## Fase 5 — US3: Atualizar e retirar páginas (P2)

**Objetivo**: publicar um snapshot completo no próximo build/deploy e garantir que
cadastros retirados não permaneçam em arquivos gerados.

**Teste independente**: alterar e retirar cadastros sintéticos, regenerar o
snapshot completo e confirmar conteúdo atualizado, remoção de HTML antigo,
cache documentado e procedimento de roll-forward.

### Testes da US3

- [ ] T022 [P] [US3] Adicionar cenários de criação, edição, retirada e falha de publicação em `client/scripts/generate-storefront.spec.ts`, verificando que nenhuma página obsoleta permanece no snapshot promovido.

### Implementação da US3

- [ ] T023 [US3] Gerar o snapshot completo em diretório temporário e substituir apenas a saída SSG validada em `client/scripts/generate-storefront.mts`, removendo HTML de slugs retirados sem tocar em arquivos fora do escopo.
- [ ] T024 [US3] Configurar em `firebase.json` revalidação de HTML e cache imutável para assets versionados, preservando a precedência dos arquivos estáticos e o rewrite profundo aprovado.
- [ ] T025 [US3] Documentar em `client/README.md` como executar build/publicação após mudanças em `public_businesses`, falhas, propagação no próximo deploy e retirada sem rollback de snapshot antigo.
- [ ] T026 [US3] Atualizar `specs/013-arquitetura-storefront-publico/quickstart.md` com evidências de alteração/retirada no Emulator e o limite de que não há gatilho automático nem SLA de propagação.

**Checkpoint**: build/deploy de teste reflete somente cadastros atualmente publicados.

## Fase final — Qualidade e aspectos transversais

- [ ] T027 Executar os testes focados e a suíte de `client` com `npm run test --workspace client` e registrar resultados em `specs/013-arquitetura-storefront-publico/quickstart.md`.
- [ ] T028 Executar `npm run build --workspace client` com configuração de teste autorizada e registrar sucesso/falha em `specs/013-arquitetura-storefront-publico/quickstart.md`.
- [ ] T029 Validar no Hosting Emulator acesso direto, refresh, arquivos/rewrites/404, PWA e zero invocações de `renderStorefront`; registrar resultados em `specs/013-arquitetura-storefront-publico/quickstart.md`.
- [ ] T030 Medir LCP, TTFB e transição catálogo/agendamento antes/depois sob as mesmas condições e registrar valores absolutos, amostra, rede e cache em `specs/013-arquitetura-storefront-publico/quickstart.md`.
- [ ] T031 Atualizar `specs/013-arquitetura-storefront-publico/plan.md` com resultados finais, impacto aprovado à Spec 010, limites de cache/rollback e pendências; não fazer deploy de produção.

## Dependências e ordem

- T001 e T002 podem ser feitas independentemente; T003 depende do teste T002.
- US1 depende do snapshot T003. T004–T007 são paralelizáveis por trabalharem
  arquivos distintos. T008 segue T004; T009 depende de T003/T005/T008; T010
  depende de T009; T011 depende de T006/T010; T012 depende de T011; T013
  depende de T008/T011; T014 depende de T007/T011; T015 depende de T009/T011/T014.
- US2 depende da integração básica da US1. T016 e T017 são paralelizáveis entre
  si, mas não com alterações nos mesmos arquivos; T018 depende de T016, T019 de
  T017, T020 depende de T015/T018/T019 e T021 valida as rotas integradas.
- US3 depende de US1/US2. T022 precede T023; T024 pode ocorrer em paralelo com
  T022/T023 após T015; T025 depende de T023/T024; T026 depende das validações
  atualizadas.
- T027–T030 dependem das histórias integradas; T031 depende dos resultados de
  testes e medições.

## Oportunidades de paralelismo

- Após T003, T004 (renderização), T005 (gerador), T006 (navegação) e T007
  (reuso de dados) podem ser preparados em paralelo, mantendo tarefas de teste
  em arquivos distintos.
- Na US2, T016 (validação do snapshot) e T017 (estados do booking) podem ser
  trabalhados em paralelo por atuarem em arquivos diferentes.
- Na US3, T024 (headers Hosting) pode ser preparado em paralelo aos testes e à
  limpeza do snapshot, desde que preserve o rewrite configurado em T015.

## Estratégia incremental

O MVP técnico da US1 prova HTML por empresa e navegação SPA em ambiente isolado.
Não promover uma versão pública até concluir também US2 (404/erros/rotas) e US3
(remoção de páginas e ciclo de publicação), além dos gates de regressão e
desempenho. Nenhuma etapa inclui deploy de produção.
