# Tarefas: Performance da vitrine pública

**Entrada**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md),
[contrato](contracts/storefront-performance.md) e [quickstart.md](quickstart.md).

## Fase 1 — Preparação

- [X] T001 Registrar condições e limitações da linha de base em `specs/015-performance-vitrine-publica/quickstart.md`, sem alterar produção.
- [X] T002 Identificar chunks, carregamento de fontes e candidatos a LCP em `client/vite.config.ts`, `client/index.html` e `client/src/entry-client.tsx`.

## Fase 2 — Fundamentos

- [X] T003 Verificar nomes de assets e política de cache configurada em `firebase.json` e `client/vite.config.ts`; o efeito em Hosting depende de publicação futura.
- [X] T004 Identificar diferenças entre placeholders e cartões em `client/src/styles/index.css`, `client/src/styles/theme.css` e `client/src/components/molecules/SkeletonCard/`.

## Fase 3 — US1: Vitrine rápida e estável (P1)

**Teste independente**: abrir catálogo com produtos e promoções em mobile e desktop;
verificar prioridade, variantes, geometria e estados de carregamento.

- [X] T005 [US1] Cobrir prioridade das imagens, promoções e lazy loading em `client/src/pages/CompanyCatalogPage.spec.tsx`.
- [X] T006 [US1] Cobrir URLs de variantes seguras e fallback para originais em `client/src/utils/catalog-image.util.spec.ts`.
- [X] T007 [US1] Ajustar prioridade e dimensões das imagens candidatas em `client/src/components/templates/CompanyCatalogTemplate/CompanyCatalogTemplate.tsx`.
- [X] T008 [US1] Implementar variantes responsivas comprovadas em `client/src/utils/catalog-image.util.ts` e integrar ao template apenas quando o provedor as suportar.
- [X] T009 [US1] Corrigir o deslocamento observado na transição de skeletons em `client/src/components/templates/CompanyCatalogTemplate/CompanyCatalogTemplate.tsx`, preservando a aparência final.
- [X] T010 [US1] Avaliar fonte e CSS em `client/index.html` e `client/src/styles/`; preservados por falta de evidência de ganho sem risco visual.

## Fase 4 — US2: Preservar navegação e agendamento (P1)

**Teste independente**: navegar de catálogo para booking e voltar; abrir link
direto e verificar estados, autenticação e monitoramento.

- [X] T011 [US2] Executar testes de navegação existentes em `client/src/app/` e adicionar cobertura de inicialização em `client/src/config/firebase-functions.config.spec.ts`.
- [X] T012 [US2] Reduzir código inicial em `client/src/config/firebase-functions.config.ts` e `client/src/components/templates/CompanyCatalogTemplate/CompanyCatalogTemplate.tsx`, preservando Sentry e autenticação.
- [X] T013 [US2] Verificar dependências compartilhadas e tamanhos dos chunks emitidos por `client/vite.config.ts`.

## Fase 5 — US3: Cache e medição (P2)

**Teste independente**: inspecionar cabeçalhos e comparar medições documentadas
sem confundir a versão publicada com a local.

- [X] T014 [US3] Ajustar cache em `firebase.json` apenas para assets versionados comprovados e documentos revalidáveis.
- [X] T015 [US3] Executar testes e build de `client/package.json` e registrar resultados em `specs/015-performance-vitrine-publica/quickstart.md`.
- [X] T016 [US3] Validar navegação e medir a versão local e a URL publicada quando possível, registrando condições e impedimentos em `specs/015-performance-vitrine-publica/quickstart.md`.

## Fase final — Revisão

- [X] T017 Atualizar documentação pertinente em `client/README.md` e registrar ganhos e limitações em `specs/015-performance-vitrine-publica/quickstart.md`.

## Dependências e execução

Preparação e fundamentos antecedem as histórias. US1 e US2 podem ser avaliadas
independentemente após os fundamentos, sem editar os mesmos arquivos em paralelo;
US3 valida o resultado integrado. T005–T006 precedem T007–T009 quando aplicáveis.
O MVP é US1, seguido da preservação de fluxos e validação integrada.
