---
description: 'Task list for importing a business and catalog from CSV'
---

# Tasks: Importacao de empresas por CSV

**Input**: Design documents from `/specs/007-business-csv-onboarding/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/company-import-cli.md`, `quickstart.md`

**Tests**: Included because the plan calls for automated tests of parsing, conversion, creation, and conflicts, and the constitution requires tests for critical business rules.

**Organization**: Tasks are grouped by user story in specification priority order. All four stories have priority P1.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other marked tasks because it touches separate files and has no unfinished dependencies.
- **[Story]**: User story from `spec.md` (US1-US4).
- Each task includes the relevant repository file path.

## Path Conventions

- Functions CLI and tests: `functions/test/fixtures/`
- Shared tenant domain: `shared/domain/interfaces/`
- Backoffice and public business surfaces: `functions/src/` and `backoffice/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Wire the new command into the existing workspaces without changing or invoking the destructive production seed.

- [x] T001 Add the `import:company` command in the root `package.json` and forward it to the Functions workspace in `functions/package.json`, without changing `seed:production`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish complete local CSV validation and a safe execution boundary before any story writes to Firebase.

**Checkpoint**: All file validation and production safety checks must pass before any Firebase initialization or writes.

- [x] T002 [P] Add Vitest cases in `functions/test/fixtures/company-import-csv.spec.ts` for UTF-8 BOM handling, semicolon-delimited rows, malformed/duplicate headers, references, duplicate emails/IDs/variants/combinations, legacy and independent attributes, wildcard price expansion, exact Brazilian cents, and invalid company/product data.
- [x] T003 Implement the typed CSV parser and whole-file local validation in `functions/test/fixtures/company-import-csv.ts`, including legacy variation rows, independent attributes/options, wildcard combination prices, actionable line/field errors, and no Firebase reads.
- [x] T004 [P] Add CLI guard tests in `functions/test/fixtures/import-company.spec.ts` for missing confirmation/project/file arguments and rejection of `demo-*` projects or Firebase emulator environment variables.
- [x] T005 Implement the CLI execution boundary in `functions/test/fixtures/import-company.ts`: require project, file, and explicit production confirmation; reject demo/emulator execution; parse and validate the complete file before initializing Firebase or writing; use existing Firebase Admin credentials.

---

## Phase 3: User Story 1 - Cadastrar uma empresa a partir de um arquivo (Priority: P1)

**Goal**: Create one published tenant and its backoffice administrator from a valid CSV, including support for the `home` segment.

**Independent Test**: Import a valid company-and-administrator CSV and verify the published company and associated administrator can access only that company's backoffice; an invalid number of company rows is rejected before writes.

### Tests for User Story 1

- [x] T006 Add company/admin creation and tenant-scope tests in `functions/test/fixtures/import-company.spec.ts`, covering one company, a backoffice account, and rejection of zero or multiple company rows before writes.

### Implementation for User Story 1

- [x] T007 Implement create-only tenant and administrator provisioning in `functions/test/fixtures/import-company.ts`, mapping the company, published public business, Auth account, role, and tenant-scoped user document without merging or persisting the password.
- [x] T008 Add the `home` segment to the tenant segment type in `shared/domain/interfaces/tenant.interface.ts`.
- [x] T009 [P] Accept the `home` segment in company settings validation in `functions/src/services/backoffice.service.ts`.
- [x] T010 [P] Accept and expose the `home` segment in the public business listing in `functions/src/functions/catalog/list-public-businesses.ts`.
- [x] T011 [P] Display the `home` segment label in `backoffice/src/pages/CompanySettingsPage.tsx`.

**Checkpoint**: A CSV containing only one company and its administrator is independently importable, with the company published and tenant-scoped.

---

## Phase 4: User Story 2 - Importar colaboradores com seus acessos (Priority: P1)

**Goal**: Create each declared collaborator's staff account, professional profile, product assignments, and working hours under the imported tenant.

**Independent Test**: Import a company with Italo and declared products; verify his Auth account, collaborator role, tenant-scoped profile, product assignments, and valid weekly working hours.

### Tests for User Story 2

- [x] T012 [P] Add collaborator account, profile, product-assignment, and working-hours tests in `functions/test/fixtures/import-company-staff.spec.ts`, including rejection of missing/invalid identifiers, phone, email, password, or company email domain before writes.

### Implementation for User Story 2

- [x] T013 Create collaborator Auth accounts and tenant-scoped user/professional documents in `functions/test/fixtures/import-company.ts`, requiring the CSV identifier, Brazilian phone, company-domain email, and policy-compliant initial password; never persist or report passwords.
- [x] T014 Create working-hour records and associate every imported professional with every declared product in `functions/test/fixtures/import-company.ts`, using the CSV schedule, timezone, and product IDs.

**Checkpoint**: The imported collaborator can authenticate with the collaborator role and has the declared professional profile, product links, and working hours.

---

## Phase 5: User Story 3 - Importar um catalogo com variacoes e precos (Priority: P1)

**Goal**: Publish the declared catalog with exact per-variant prices and provide the Soft Stylus example CSV without operational credentials or invented personal data.

**Independent Test**: Import the Soft Stylus example after filling its required blank fields and verify the public catalog contains eight products, 33 legacy variants, and all 432 exact prices for the configurable `Sofá + Poltronas` combo.

### Tests for User Story 3

- [x] T015 [P] Add product, public projection, and variant-price tests in `functions/test/fixtures/import-company-catalog.spec.ts`, including exact cent conversion, legacy defaults, independent attributes, wildcard price expansion, and complete combo pricing.

### Implementation for User Story 3

- [x] T016 Create each tenant-scoped product and public product projection in `functions/test/fixtures/import-company.ts`, supporting legacy `Variacao` products and multi-attribute products with exact combination prices.
- [x] T017 [P] Add `functions/test/fixtures/templates/soft-stylus.example.csv` with the eight products, existing standalone prices, the configurable `Sofá + Poltronas` combo with seven attributes and 432 exact prices, illustrative fabric/color options, and blank initial passwords and collaborator phone.

**Checkpoint**: Imported products and variant prices appear correctly in the existing public booking catalog and remain tenant-scoped.

---

## Phase 6: User Story 4 - Rejeitar importacoes inseguras sem afetar dados existentes (Priority: P1)

**Goal**: Ensure create-only conflicts, mid-import failures, recovery, and all outputs preserve existing data and never expose credentials or personal phone numbers.

**Independent Test**: Exercise malformed files, duplicate Auth/Firestore identifiers, and a forced post-creation failure; verify pre-write validation, no overwrites, cleanup limited to records created by the attempt, and sanitized output.

### Tests for User Story 4

- [x] T018 [P] Add conflict, rollback, and redaction tests in `functions/test/fixtures/import-company-safety.spec.ts`, asserting no preflight Firebase reads, no deletion of pre-existing records, and no password or personal phone in errors, logs, or success output.

### Implementation for User Story 4

- [x] T019 Make all Auth and Firestore writes in `functions/test/fixtures/import-company.ts` create-only; stop on the first duplicate without pre-reading Firebase or overwriting existing records.
- [x] T020 Track only Auth users and Firestore documents created by the current invocation in `functions/test/fixtures/import-company.ts`; on a later failure, remove only those records and report recovery outcomes without sensitive values.
- [x] T021 Sanitize errors, logs, and the final summary in `functions/test/fixtures/import-company.ts` so they include actionable record identifiers and aggregate counts but never passwords or personal phone numbers.
- [x] T022 [P] Define and ignore an operator-only CSV location in `.gitignore`, and document that location plus credential-file protection and secure removal in `specs/007-business-csv-onboarding/quickstart.md`; keep the blank Soft Stylus template tracked.

**Checkpoint**: Conflicts and failures preserve pre-existing data; only records from the current attempt can be rolled back, and all outputs are sanitized.

---

## Phase 7: Polish & Cross-Cutting Validation

**Purpose**: Confirm the documented operator flow and existing Functions build/test commands work without reaching production Firebase.

- [x] T023 Validate the documented commands in `specs/007-business-csv-onboarding/quickstart.md` using `npm run build:functions` and `npm run test --workspace functions -- test/fixtures/company-import-csv.spec.ts`; do not run a production import or `seed:production`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; adds the command entry points only.
- **Foundational (Phase 2)**: Depends on setup and blocks all user-story writes; parser and CLI safety must be complete first.
- **User Stories (Phases 3-6)**: Depend on the foundational parser and execution boundary.
- **Polish (Phase 7)**: Depends on all selected stories being implemented.

### User Story Dependencies

- **US1 (P1)**: First increment after foundational work; creates the tenant/admin base and is the MVP.
- **US2 (P1)**: Builds on US1's tenant; uses products declared in the same CSV for assignments.
- **US3 (P1)**: Builds on the tenant and staff declarations to publish products, public projections, and working hours/assignments.
- **US4 (P1)**: Applies to every write path from US1-US3; finish and validate it before any operational import.

### Parallel Opportunities

- T002 and T004 can be developed in parallel because they cover separate test files.
- In US1, the company settings, public listing, and UI segment acceptance changes (T009-T011) touch separate files and can be developed in parallel after the tenant segment is defined in T008.
- Independent story test suites (T012, T015, T018) can be authored in parallel after the foundational CLI/parser contracts are agreed; their implementations still need to follow the dependencies above.
- US2, US3, and US4 all extend `functions/test/fixtures/import-company.ts`; avoid parallel edits to that file and integrate them in the stated story order.

---

## Parallel Example: User Story 1

```text
After T007-T008 establish the company creation flow and tenant segment:
Task: T009 - Accept `home` in backoffice company validation
Task: T010 - Accept `home` in public business listing
Task: T011 - Display the `home` segment in company settings
```

## Parallel Example: User Story 2

```text
No safe parallel implementation split: T013 and T014 both change
functions/test/fixtures/import-company.ts. Complete T012 first, then T013 and T014.
```

## Parallel Example: User Story 3

```text
After US1 and US2 are integrated, author T015 and prepare T017 in parallel:
Task: T015 - Add catalog and variant-price tests
Task: T017 - Prepare the blank-credential Soft Stylus CSV example
Then complete T016 in functions/test/fixtures/import-company.ts.
```

## Parallel Example: User Story 4

```text
Author T018 first. T022 can be prepared in parallel with that test because it
only changes .gitignore and quickstart.md. Complete T019-T021 serially because
they all change functions/test/fixtures/import-company.ts.
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational parsing and production safeguards.
3. Complete Phase 3: User Story 1.
4. Stop and independently verify company publication, administrator access, tenant scope, and invalid company-row rejection before proceeding.

### Incremental Delivery

1. Setup and foundational work: establish a safe, locally validated CSV command.
2. US1: import a company and administrator as the MVP.
3. US2: add collaborator access, profiles, product assignments, and hours.
4. US3: add the complete priced catalog and Soft Stylus example.
5. US4: complete conflict recovery, rollback, redaction, and local credential-file protections before an operational import.
6. Run the documented build and targeted tests; never invoke the production seed for CSV import.
