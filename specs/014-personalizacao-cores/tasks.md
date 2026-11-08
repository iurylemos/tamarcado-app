# Tasks: Personalização de Cores do Cliente

**Input**: Design documents from `specs/014-personalizacao-cores/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contract](contracts/company-theme.md),
[quickstart.md](quickstart.md)

**Tests**: Incluídos porque a solicitação exige testes da personalização e
regressão. Para cada história, escrever testes antes da implementação.

**Organization**: Tarefas agrupadas por história para configuração no backoffice
e apresentação pública por empresa.

## Phase 1: Setup

**Purpose**: Confirmar a linha de base e usar scripts/ambientes já existentes,
sem instalar dependências ou alterar produção.

- [X] T001 Executar os testes baseline direcionados antes de qualquer alteração: `CompanySettingsPage.spec.tsx` (3/3) e testes de snapshot/SSR/navegação do client (8/8) passaram; `manage-company.spec.ts` passou isolado com Firestore Emulator (4/4). A suíte geral via `npm run test:emulator` não iniciou porque as portas padrão já estavam ocupadas.

---

## Phase 2: Foundational

**Purpose**: Estabelecer validação e tipos compartilhados necessários às duas
histórias.

- [X] T002 [P] Adicionar testes para formato RGB hexadecimal de seis dígitos, `#` opcional, normalização e cálculo de contraste em `shared/domain/color.spec.ts`.
- [X] T003 Implementar validação, normalização e cálculo de contraste puros em `shared/domain/color.ts`; fazer os testes de `shared/domain/color.spec.ts` passarem.
- [X] T004 [P] Adicionar os campos opcionais `primaryColor` e `secondaryColor` aos tipos existentes em `shared/domain/interfaces/tenant.interface.ts`, `functions/src/model/tenant.model.ts`, `backoffice/src/interfaces/admin.interface.ts`, `backoffice/src/interfaces/company.interface.ts` e `client/src/interfaces/company.interface.ts`.

**Checkpoint**: Contrato de valores e tipos opcionais disponível sem criar
collections, regras ou migrações; histórias podem começar.

---

## Phase 3: User Story 1 - Configurar a identidade visual da empresa (Priority: P1)

**Goal**: Permitir escolher, visualizar e salvar as duas cores somente para a
empresa ativa, preservando autorização e compatibilidade com payloads antigos.

**Independent Test**: Selecionar cores válidas no backoffice, conferir preview e
hexadecimal, salvar pela operação existente e verificar no emulador que os dois
documentos existentes correspondentes à empresa receberam as cores normalizadas.
Testar também rejeição de valor inválido e preservação de dados quando um
payload antigo omitir as propriedades.

### Tests for User Story 1

- [X] T005 [P] [US1] Testar picker, entrada hexadecimal, atualização da prévia, payload de salvamento, validação visível e falha de gravação em `backoffice/src/pages/CompanySettingsPage.spec.tsx`.
- [X] T006 [P] [US1] Testar cores válidas normalizadas, rejeição de hex inválido, preservação quando propriedades opcionais forem omitidas e isolamento entre tenants em `functions/src/functions/backoffice/manage-company.spec.ts`.

### Implementation for User Story 1

- [X] T007 [US1] Estender `saveTenantSettings` em `functions/src/services/backoffice.service.ts` para validar as cores com `shared/domain/color.ts`, gravar os valores fornecidos nos documentos existentes `tenants` e `public_businesses` na transação atual e preservar valores já armazenados quando payloads antigos omitirem os campos.
- [X] T008 [US1] Adicionar seletores de cor acessíveis, campos hexadecimais sincronizados, prévia, validação local e envio de `primaryColor`/`secondaryColor` no formulário de `backoffice/src/pages/CompanySettingsPage.tsx`; preservar os estados existentes de salvamento e erro.
- [X] T009 [US1] Executar os testes de `backoffice/src/pages/CompanySettingsPage.spec.tsx` e `functions/src/functions/backoffice/manage-company.spec.ts` com o emulador conforme `specs/014-personalizacao-cores/quickstart.md`; corrigir falhas sem alterar regras Firestore.

**Checkpoint**: A configuração salva e reabre por empresa, valores inválidos
falham explicitamente e o payload legado não apaga cores existentes.

---

## Phase 4: User Story 2 - Ver a página pública com as cores da empresa (Priority: P1)

**Goal**: Aplicar cores e contraste em todas as páginas públicas da empresa atual,
com isolamento por tenant e fallback para o tema padrão.

**Independent Test**: Renderizar duas empresas com valores distintos e uma sem
personalização; verificar cores, contraste e ausência de contaminação no snapshot,
SSR e navegação entre slugs.

### Tests for User Story 2

- [X] T010 [P] [US2] Testar inclusão somente das cores válidas na projeção pública, compatibilidade quando campos estiverem ausentes e erro explícito para valores persistidos malformados em `client/scripts/public-business-snapshot.spec.ts`.
- [X] T011 [P] [US2] Testar HTML SSR de duas empresas, fallback de campos ausentes, contraste e troca de tenant sem vazamento de tema em `client/src/entry-server.spec.tsx` e `client/src/app/StorefrontNavigation.spec.tsx`.

### Implementation for User Story 2

- [X] T012 [US2] Estender `readPublicBusinessSnapshot` em `client/scripts/public-business-snapshot.ts` para validar e normalizar as cores com `shared/domain/color.ts`, projetar somente esses campos públicos e falhar explicitamente diante de valor persistido malformado.
- [X] T013 [US2] Aplicar tema por empresa nas páginas públicas usando os dados da rota atual e propriedades CSS customizadas em `client/src/app/BusinessTheme.tsx`, `client/src/pages/CompanyCatalogPage.tsx`, `client/src/pages/BookingPage.tsx` e `client/src/styles/theme.css`; manter os tokens padrão quando os campos estiverem ausentes e garantir contraste de texto/controles conforme `specs/014-personalizacao-cores/spec.md`. O escopo nas páginas permite acompanhar os dados carregados durante a navegação sem consultas adicionais.
- [X] T014 [US2] Executar os testes de `client/scripts/public-business-snapshot.spec.ts`, `client/src/entry-server.spec.tsx` e `client/src/app/StorefrontNavigation.spec.tsx`; corrigir falhas de projeção, SSR, fallback ou isolamento.

**Checkpoint**: Catálogo e páginas públicas usam somente o tema do slug atual,
empresas antigas preservam o padrão e nenhuma leitura adicional é necessária.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Confirmar regressões, tipagem e builds de todos os workspaces
autorizados; não publicar.

- [ ] T015 Executar a suíte de regressão do `client/`, testes pertinentes do `backoffice/` e `functions/`, e os builds `npm run build --workspace backoffice` e `npm run build --workspace client`; documentar resultados em `specs/014-personalizacao-cores/quickstart.md` sem executar deploy ou usar dados de produção.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 estabelece a linha de base antes de qualquer mudança.
- **Foundational (Phase 2)**: T002 e T004 não dependem entre si; T003 depende de
  T002. A fase inteira bloqueia as histórias.
- **User Stories (Phase 3+)**: US1 e US2 dependem da fase foundational; as duas
  histórias podem avançar em paralelo após ela, usando fixtures distintas.
- **Polish (Phase 5)**: T015 depende de todas as implementações e verificações
  focadas anteriores.

### User Story Dependencies

- **User Story 1 (P1)**: Começa após T001–T004. T005 e T006 podem ser escritos
  em paralelo; T007 depende de T003, T004 e T006; T008 depende de T004 e T005;
  T009 depende de T007 e T008.
- **User Story 2 (P1)**: Começa após T001–T004 e pode ser testada com snapshots
  sintéticos sem depender da gravação da US1. T010 e T011 podem ser escritos em
  paralelo; T012 depende de T003, T004 e T010; T013 depende de T003, T004 e T011;
  T014 depende de T012 e T013. A validação ponta a ponta com dados
  salvos integra as duas histórias.

### Parallel Opportunities

- Depois de T001, T002 e T004 podem ser executadas em paralelo.
- Na US1, T005 e T006 são testes em arquivos/workspaces diferentes; depois de
  seus contratos estarem cobertos, T007 e T008 podem ser implementadas em
  paralelo.
- Na US2, T010 e T011 são testes independentes; após ambos falharem como
  esperado, T012 e T013 podem ser implementadas em paralelo em áreas distintas,
  com integração final coberta por T014.
- US1 e US2 podem ser desenvolvidas por pessoas diferentes depois da fase
  foundational, mas a validação ponta a ponta e T015 devem esperar ambas.

## Parallel Example: User Story 1

```text
Task: T005 CompanySettingsPage tests in backoffice/src/pages/CompanySettingsPage.spec.tsx
Task: T006 saveTenantSettings tests in functions/src/functions/backoffice/manage-company.spec.ts
```

## Parallel Example: User Story 2

```text
Task: T010 snapshot projection tests in client/scripts/public-business-snapshot.spec.ts
Task: T011 SSR/navigation isolation tests in client/src/entry-server.spec.tsx and client/src/app/StorefrontNavigation.spec.tsx
```

## Implementation Strategy

### MVP

1. Concluir T001–T004.
2. Implementar e verificar US1 (T005–T009) no backoffice e em Functions local.
3. Implementar e verificar US2 (T010–T014) com snapshot sintético e SSR.
4. Executar T015 para regressão e builds.

### Incremental Validation

1. Garantir que o teste novo falha antes de implementar cada comportamento.
2. Validar separadamente salvamento e isolamento da US1.
3. Validar snapshot, fallback, contraste e isolamento da US2.
4. Validar o fluxo integrado com duas empresas sintéticas e uma empresa sem
   cores; nenhum incremento inclui publicação em produção.
