# Tasks: Personalizacao dinamica de produtos e galerias por variacao

**Input**: Design documents in `/specs/006-product/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, and `contracts/product-customization.md`

**Tests**: Automated tests are required by `spec.md`. Add and run focused tests for each story, including compatibility, authorization, and failure cases.

**Organization**: Tasks are grouped by user story. Complete shared setup and foundation first; then deliver each independently verifiable story in dependency order.

## Phase 1: Setup

**Purpose**: Configure the Storage integration and emulator/rules deployment surface required by image galleries.

- [ ] T001 [P] Initialize Firebase Storage with an explicit bucket setting in `backoffice/src/config/firebase.config.ts`.
- [ ] T002 [P] Add `storage.rules` and register Storage Rules and the Storage Emulator in `firebase.json`; allow public reads only for product image paths and scope authenticated writes to active backoffice claims and the matching tenant path.

## Phase 2: Foundational

**Purpose**: Define shared contracts required by product configuration, booking validation, and appointment snapshots.

- [ ] T003 Define shared product customization, product image/gallery, appointment selection, and snapshot types in `shared/domain/interfaces/product.interface.ts` and `shared/domain/interfaces/appointment.interface.ts`; model the data-model constraints verbatim: each configured attribute has at least two options and a default option ID belonging to that attribute, each gallery contains one to ten images, selections contain exactly one valid option per configured attribute, and selected image IDs belong to the effective gallery. Runtime validation is implemented in the story-specific Functions tasks.

**Checkpoint**: Shared types and Storage configuration are ready; user-story tasks can proceed according to their dependencies.

## Phase 3: User Story 1 - Configurar atributos de um produto (Priority: P1)

**Goal**: Let backoffice users maintain optional, dynamic product attributes and options, including a valid default, while keeping product description ownership in the backoffice.

**Independent Test**: Create/edit a product with multiple attributes and defaults, verify the saved configuration is returned to the public catalog, reject invalid option/default configurations, and confirm products without attributes and existing descriptions remain supported.

### Tests for User Story 1

- [ ] T004 [P] [US1] Add ProductEditor tests for adding/removing attributes and options, selecting defaults, validating fewer than two options, and retaining backoffice-owned descriptions in `backoffice/src/pages/ProductsPage.spec.tsx`.
- [ ] T005 [P] [US1] Add product callable tests for valid optional attributes, duplicate/invalid options, invalid defaults, and products without attributes in `functions/src/functions/products/manage-product.spec.ts`.

### Implementation for User Story 1

- [ ] T006 [P] [US1] Create isolated customization test fixtures based on Studio Aurora and Clínica Horizonte, preserving `service-corte` and `service-consulta` without attributes and inactive `service-hidratacao`, and adding `service-coloracao` with Cor options Padrão/Castanho/Loiro in `functions/test/fixtures/product-customization-data.ts`.
- [ ] T007 [US1] Add optional `customizationAttributes` parsing, validation, persistence, and public projection support to `functions/src/model/product.model.ts`, `functions/src/services/backoffice.service.ts`, and `functions/src/functions/products/manage-product.ts`; enforce at least two options per attribute and a default option ID belonging to its own option list.
- [ ] T008 [US1] Add dynamic attribute/option editing and per-attribute default selection to `backoffice/src/components/organisms/ProductEditor/ProductEditor.tsx` and `backoffice/src/interfaces/admin.interface.ts`; allow zero attributes and keep description edits exclusively in the backoffice.

**Checkpoint**: Backoffice can save valid dynamic attribute definitions; invalid configurations are rejected, and no-attribute products remain compatible.

## Phase 4: User Story 2 - Personalizar o serviço durante o agendamento (Priority: P1)

**Goal**: Let customers select configured options, review them in “RESUMO DO SERVIÇO”, and submit only stable option IDs without changing the shared product.

**Independent Test**: Open a configured service, verify each default is preselected, change options, verify the summary and submitted IDs, and book a no-attribute service through the existing flow.

### Tests for User Story 2

- [ ] T009 [P] [US2] Add booking UI tests for default selections, changing one or multiple options, summary labels, inactive products, and the no-attribute flow in `client/src/pages/BookingPage.spec.tsx` and `client/src/components/organisms/BookingForm/BookingForm.spec.tsx`.
- [ ] T010 [P] [US2] Add public appointment tests for valid selections, missing/duplicate/extra selections, unknown or cross-product option IDs, stale options, inactive products, and no-attribute compatibility in `functions/src/functions/appointments/create-public-appointment.spec.ts`.

### Implementation for User Story 2

- [ ] T011 [US2] Map optional product customization attributes from public catalog documents in `client/src/interfaces/product.interface.ts`, `client/src/interfaces/company.interface.ts`, and `client/src/services/catalog.service.ts`, preserving products whose documents omit the new field.
- [ ] T012 [US2] Render dynamic attribute controls and selected values in the booking flow and “RESUMO DO SERVIÇO” in `client/src/components/organisms/BookingServiceSummary/BookingServiceSummary.tsx`, `client/src/components/organisms/BookingForm/BookingForm.tsx`, and `client/src/pages/BookingPage.tsx`; initialize each attribute from its configured default.
- [ ] T013 [US2] Submit attribute/option IDs with the existing appointment request in `client/src/interfaces/appointment.interface.ts` and `client/src/services/appointment.service.ts`; do not send editable descriptions, trusted labels, or price overrides.
- [ ] T014 [US2] Validate exactly one current option for every configured attribute and persist server-derived attribute/option labels in `functions/src/services/booking.service.ts` and `functions/src/functions/appointments/create-public-appointment.ts`; preserve existing reservation, availability, price, duration, commission, and status behavior.

**Checkpoint**: Customers can complete bookings with configured choices; Functions rejects invalid selections and stores trusted historical labels.

## Phase 5: User Story 3 - Receber e preservar as escolhas do agendamento (Priority: P1)

**Goal**: Show collaborators the choices recorded for an appointment and preserve historical values when the product configuration changes.

**Independent Test**: Load a customized appointment in the existing collaborator agenda, verify its original attribute/option labels after editing the product, and confirm a legacy appointment without customization fields still renders.

### Tests for User Story 3

- [ ] T015 [P] [US3] Add appointment listing and collaborator card tests for customized snapshots, product edits after booking, and historical appointments without customization fields in `functions/src/functions/appointments/list-appointments.spec.ts` and `collaborator/src/pages/AppointmentsPage.spec.tsx`.

### Implementation for User Story 3

- [ ] T016 [US3] Forward optional customization snapshots from stored appointments in `functions/src/services/appointment-operations.service.ts` and `functions/src/functions/appointments/list-appointments.ts`; preserve responses for legacy documents without the fields.
- [ ] T017 [US3] Map customization snapshots in `collaborator/src/interfaces/appointment.interface.ts` and display attribute/option labels in the existing appointment card in `collaborator/src/components/organisms/AppointmentCard/AppointmentCard.tsx`.

**Checkpoint**: Collaborators can read the choices from the appointment snapshot, regardless of later product edits; legacy appointments remain readable.

## Phase 6: User Story 4 - Cadastrar e visualizar imagens por variação (Priority: P1)

**Goal**: Let backoffice users upload default and exact-combination galleries and let customers see the matching gallery, or the default fallback, in the catalog and booking summary.

**Independent Test**: Upload a default gallery and a gallery for an exact combination, verify the catalog card still uses the default image, switch booking options and verify exact-match/fallback galleries and accessible carousel behavior, then confirm the selected main image is stored and shown to the collaborator.

### Tests for User Story 4

- [ ] T018 [P] [US4] Add image upload/gallery editor tests for JPEG/PNG/WebP, the 5 MB per-file limit, one-to-ten images, upload progress/incomplete uploads, removal, and surfaced partial failures in `backoffice/src/pages/ProductsPage.spec.tsx`.
- [ ] T019 [P] [US4] Add gallery callable tests for tenant ownership, exact complete combinations, unique combination keys, one-to-ten image references, public projection changes, and cleanup failures in `functions/src/functions/products/manage-product.spec.ts`.
- [ ] T020 [P] [US4] Add catalog/booking tests for default card images, exact-match gallery switching, default fallback, selected main image, and accessible carousel controls in `client/src/services/catalog.service.spec.ts`, `client/src/pages/CompanyCatalogPage.spec.tsx`, and `client/src/pages/BookingPage.spec.tsx`.
- [ ] T021 [P] [US4] Add Storage Emulator Rules tests for public product-image reads, active backoffice tenant-scoped create/delete, cross-tenant denial, invalid MIME types, and files over 5 MB in `functions/test/storage.rules.spec.ts`.
- [ ] T022 [P] [US4] Add appointment tests for rejecting a selected image ID outside the effective gallery and persisting the server-resolved URL of a valid selected main image in `functions/src/functions/appointments/create-public-appointment.spec.ts`.
- [ ] T023 [P] [US4] Extend isolated test data with default and exact-combination galleries for Cor, Tecido (Padrão/Linho/Suede/Veludo), and Tamanho (Casal/King), including an unconfigured combination that uses fallback, no-attribute legacy-image products, and customized/legacy appointments in `functions/test/fixtures/product-customization-data.ts`.

### Implementation for User Story 4

- [ ] T024 [US4] Add the product default-image references, legacy `imageUrl` mapping, internal/public exact-combination gallery model, and Firestore collection names in `functions/src/model/product.model.ts`, `functions/src/model/product-gallery.model.ts`, and `functions/src/config/collections.ts`; each gallery must identify exactly one option per configured attribute and contain one to ten images.
- [ ] T025 [US4] Implement tenant-scoped Firebase Storage upload, progress, and deletion helpers in `backoffice/src/services/product-image.service.ts`; accept only JPEG, PNG, or WebP files up to 5 MB each and surface upload, metadata, and cleanup partial failures.
- [ ] T026 [US4] Extend the product editor to manage the required one-to-ten-image default gallery and optional galleries for exact combinations in `backoffice/src/components/organisms/ProductEditor/ProductEditor.tsx`; block publishing until required uploads complete and use the existing image as the first default image for legacy products.
- [ ] T027 [US4] Add authorized default-gallery saves through `saveProduct` and exact-combination gallery save/delete operations with public projection updates in `functions/src/services/backoffice.service.ts` and `functions/src/functions/products/manage-product.ts`; validate product tenant ownership, complete option combinations, one-to-ten images per gallery, preserve `imageUrl` as the first default image, and report metadata/Storage partial failures explicitly.
- [ ] T028 [US4] Load published product galleries with the business catalog in one bounded query and map the same gallery shape for browser and server-rendered storefronts in `functions/src/services/public-catalog.service.ts`, `functions/src/functions/catalog/get-public-catalog.ts`, `functions/src/functions/catalog/render-storefront.ts`, and `client/src/services/catalog.service.ts`.
- [ ] T029 [US4] Show the default image on catalog cards and render the effective gallery as a main image with accessible thumbnails/carousel in `client/src/components/organisms/ProductImageGallery/ProductImageGallery.tsx`, `client/src/components/templates/CompanyCatalogTemplate/CompanyCatalogTemplate.tsx`, and `client/src/components/organisms/BookingServiceSummary/BookingServiceSummary.tsx`; use a variant gallery only for an exact complete selection match, otherwise use the default.
- [ ] T030 [US4] Submit the selected main image ID and validate it against the effective gallery in `client/src/services/appointment.service.ts` and `functions/src/services/booking.service.ts`; persist the server-resolved URL in `productImageUrlSnapshot` without trusting a client-supplied URL.
- [ ] T031 [US4] Display `productImageUrlSnapshot` in existing collaborator appointment cards in `collaborator/src/components/organisms/AppointmentCard/AppointmentCard.tsx`, while retaining the existing image/no-image behavior for historical appointments.

**Checkpoint**: Gallery management, exact-match/fallback rendering, selected-image snapshots, and legacy image compatibility work end to end.

## Phase 7: Polish and Cross-Cutting Validation

**Purpose**: Verify affected applications and emulator rules against the feature quickstart after all stories are integrated.

- [ ] T032 Run the focused workspace tests and builds, Storage Rules Emulator checks, and manual scenarios documented in `specs/006-product/quickstart.md`; resolve regressions without changing existing booking or commercial behavior.

## Dependencies and Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; configures Firebase Storage and its Rules/Emulator.
- **Foundational (Phase 2)**: Depends on Setup; shared contracts block feature implementation.
- **User Stories (Phases 3-6)**: Depend on the foundation and follow the story dependencies below.
- **Polish (Phase 7)**: Depends on all selected stories being complete.

### User Story Dependencies

- **US1 (P1)**: Starts after Phase 2; independent product-configuration increment.
- **US2 (P1)**: Depends on US1's public product attributes and defaults.
- **US3 (P1)**: Depends on US2's appointment customization snapshot being persisted.
- **US4 (P1)**: Depends on US1's configured attributes and US2's selected booking options; selected-image rendering in the collaborator card also builds on US3.

### Within Each User Story

- Tests are written before the corresponding implementation and should fail for the missing behavior.
- Shared types precede feature-specific model/service/UI work.
- Product configuration precedes customer selection; appointment persistence precedes collaborator display.
- Gallery metadata and uploaded files precede catalog/booking gallery rendering and selected-image snapshots.

### Parallel Opportunities

- T001 and T002 touch separate configuration/rules files and can run in parallel.
- Within US1, T004, T005, and T006 touch independent test/fixture files and can run in parallel.
- Within US2, T009 and T010 touch separate test workspaces and can run in parallel.
- Within US4, T018-T022 are independent test/fixture files and can run in parallel; implementation tasks should follow the gallery model and metadata dependencies.

## Parallel Example: User Story 2

```text
Task: T009 Add booking UI tests in client/src/pages/BookingPage.spec.tsx and client/src/components/organisms/BookingForm/BookingForm.spec.tsx
Task: T010 Add appointment validation tests in functions/src/functions/appointments/create-public-appointment.spec.ts
```

## Implementation Strategy

### MVP First

1. Complete Setup and Foundational phases.
2. Complete US1 to configure validated product attributes.
3. Complete US2 to expose those options in booking and persist validated choices.
4. Stop and validate this end-to-end customization increment before proceeding to collaborator display and image galleries.

### Incremental Delivery

1. Deliver US1 and US2 for the smallest complete customer-customization flow.
2. Deliver US3 so collaborators can inspect immutable appointment choices.
3. Deliver US4 for uploaded galleries, exact-match/fallback selection, and selected-image snapshots.
4. Run Phase 7 focused verification and the quickstart scenarios.

## Notes

- `[P]` means the task uses files independent of other incomplete tasks.
- `[US1]` through `[US4]` map directly to the user stories in `specs/006-product/spec.md`.
- Every implementation task names its target source file; every test task names its test file.
- `functions/test/fixtures/product-customization-data.ts` is test-only; do not add new mock products or image URLs to the production seeder through the shared seed fixture.
- Gallery object deletion may make historical appointment image URLs unavailable, as accepted by the specification.
