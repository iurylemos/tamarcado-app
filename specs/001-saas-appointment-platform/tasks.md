# Tasks: SaaS Multi-Tenant Appointment Platform

**Input**: Design documents from `/specs/001-saas-appointment-platform/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`,
`quickstart.md`

**Tests**: Vitest and colocated frontend/backend tests are explicitly required by the
specification and user-provided constraints; test tasks are included per user story.

**Organization**: Tasks are grouped by user story to support incremental implementation and
independent validation. This file defines future implementation work only; generating it did
not create or modify application code.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Parallelizable when the task touches separate files and has no dependency on
  incomplete work.
- **[Story]**: User story label from `spec.md` (`US1` through `US6`).
- Each task specifies an exact target file or files.

## Path Conventions

- Frontends: `client/`, `collaborator/`, and `backoffice/`, each with its own `src/`.
- Backend: `functions/src/`.
- Shared functional domain modules: `shared/domain/`.
- Frontend component tests are colocated with their component, including
  `components/atoms/Card/Card.spec.tsx` and `components/molecules/...`.
- Backend Vitest tests follow the Cloud Function/module layout under `functions/src/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the multi-application workspace and local development prerequisites.

- [x] T001 Create root workspace manifests and scripts for `client/package.json`, `collaborator/package.json`, `backoffice/package.json`, `functions/package.json`, and `package.json`.
- [x] T002 [P] Configure shared TypeScript compiler options in `tsconfig.base.json` and app-specific configurations in `client/tsconfig.json`, `collaborator/tsconfig.json`, `backoffice/tsconfig.json`, and `functions/tsconfig.json`.
- [x] T003 [P] Configure Vite, React, Tailwind CSS, and Vitest test environments in `client/vite.config.ts`, `collaborator/vite.config.ts`, `backoffice/vite.config.ts`, and each app's `src/styles/index.css`.
- [x] T004 [P] Configure Firebase Emulator Suite services and local ports in `firebase.json` and `firestore.rules`; use Auth 9099, Firestore 8080, Functions 5001, and Hosting local emulators.
- [x] T005 [P] Define deployment targets for the client, collaborator, and backoffice Hosting sites in `firebase.json` and `.firebaserc`.
- [x] T006 [P] Create the shared design token inventory, application color palette, typography, spacing, component guidance, responsive rules, and accessibility guidance in `design-system.md`.
- [x] T007 [P] Create centrally discoverable design token configuration in `shared/domain/design-tokens.ts` and app entry styles in `client/src/styles/design-tokens.css`, `collaborator/src/styles/design-tokens.css`, and `backoffice/src/styles/design-tokens.css`.
- [x] T008 Configure project-wide linting, formatting, and Vitest conventions in `eslint.config.js`, `.prettierrc.json`, and `vitest.config.ts`.

**Checkpoint**: All four workspaces install and run locally; emulator configuration and
design-system references are documented.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement the shared domain, persistence conventions, authorization boundaries,
and emulator-backed test foundation required by every story.

**Critical**: Complete this phase before user-story implementation.

- [x] T009 [P] Define typed tenant, user, product, professional, appointment, availability, contact, and message domain models in `functions/src/model/tenant.model.ts`, `functions/src/model/user.model.ts`, `functions/src/model/product.model.ts`, `functions/src/model/professional.model.ts`, `functions/src/model/appointment.model.ts`, `functions/src/model/availability.model.ts`, `functions/src/model/contact.model.ts`, and `functions/src/model/message.model.ts`.
- [x] T010 [P] Define shared functional domain contracts, appointment statuses, typed operation errors, and Brazilian phone validation interfaces in `shared/domain/interfaces/`, `shared/domain/appointment-status.ts`, `shared/domain/errors.ts`, and `shared/domain/phone.ts`.
- [x] T011 Define root-level Firestore collection names, typed persistence boundaries, timestamp conventions, and tenant field requirements in `functions/src/config/collections.ts` and `functions/src/services/firestore.service.ts`; do not use Firestore subcollections.
- [x] T012 [P] Implement server-side tenant, role, active-user, and professional-scope authorization helpers in `functions/src/services/authorization.service.ts`; derive authorization from verified identity and persisted records, never request-body tenant identifiers.
- [x] T013 [P] Define Firestore Rules denying cross-tenant reads/writes, unauthorized role operations, and private collection access in `firestore.rules`; allow public reads only for approved catalog projections.
- [x] T014 [P] Configure frontend Firebase SDK initialization and emulator-only local connections in `client/src/config/firebase.config.ts`, `collaborator/src/config/firebase.config.ts`, and `backoffice/src/config/firebase.config.ts`; connect Auth at `127.0.0.1:9099`, Firestore at `127.0.0.1:8080`, and Functions at `127.0.0.1:5001` in `southamerica-east1` when `VITE_USE_EMULATORS === "true"`.
- [x] T015 Configure all Cloud Functions to use `southamerica-east1` in `functions/src/config/region.ts` and `functions/src/index.ts`.
- [x] T016 [P] Define explicit loading, empty, success, validation, authorization, conflict, and unexpected-error contracts in `shared/domain/operation-result.ts` and `shared/domain/errors.ts`.
- [x] T017 Configure emulator-seeded tenant, role, catalog, schedule, appointment, and messaging fixtures in `functions/test/fixtures/seed-emulator.ts` and `functions/test/fixtures/seed-data.ts`.
- [x] T018 [P] Establish reusable Vitest setup and Firebase Emulator Suite test utilities in `functions/test/vitest.setup.ts`, `client/src/test/setup.ts`, `collaborator/src/test/setup.ts`, and `backoffice/src/test/setup.ts`.
- [x] T019 Add shared status transition, half-open interval, BRL-cent, basis-point, and business-timezone rules to `shared/domain/appointment-status.ts`, `shared/domain/interval.ts`, `shared/domain/money.ts`, and `shared/domain/timezone.ts`.
- [x] T020 Resolve the source requirement for static-only utility methods against the functional architecture in `specs/001-saas-appointment-platform/plan.md`; document the agreed convention for `src/utils/date.util.ts` before utility implementation.

**Checkpoint**: Tenant isolation is enforceable in Rules and trusted functions; frontends use
local emulators; domain contracts, fixtures, and error/status conventions are ready.

---

## Phase 3: User Story 5 - Authenticate and access the correct company (Priority: P1)

**Goal**: Verify staff phone numbers through WhatsApp and expose only role- and
tenant-authorized workspaces.

**Independent Test**: Authenticate collaborator and backoffice users from two tenants; verify
invalid/expired challenges, wrong-role requests, cross-tenant access, and post-logout access
are rejected without returning protected data.

### Tests for User Story 5

- [ ] T021 [P] [US5] Test invalid, expired, replayed, and rate-limited WhatsApp verification challenges in `functions/src/functions/authentication/verify-phone.spec.ts`.
- [ ] T022 [P] [US5] Test role, tenant, professional-scope, inactive-user, and logout authorization outcomes in `functions/src/services/authorization.service.spec.ts`.
- [ ] T023 [P] [US5] Test protected-route login, authorization failure, and logout states in `collaborator/src/pages/LoginPage.spec.tsx` and `backoffice/src/pages/LoginPage.spec.tsx`.

### Implementation for User Story 5

- [ ] T024 Implement provider-neutral start/verify challenge contracts and one-time challenge lifecycle in `functions/src/services/phone-verification.service.ts`, enforcing normalized phone input and rejecting invalid, expired, replayed, or rate-limited codes.
- [ ] T025 Implement Firebase custom-token issuance only after trusted WhatsApp verification and active user/tenant/role resolution in `functions/src/functions/authentication/start-phone-verification.ts`, `functions/src/functions/authentication/verify-phone.ts`, and `functions/src/functions/authentication/index.ts`.
- [ ] T026 [P] Implement typed frontend authentication services and session contexts in `collaborator/src/services/auth.service.ts`, `collaborator/src/contexts/auth/auth.context.ts`, `collaborator/src/contexts/auth/auth.provider.ts`, `backoffice/src/services/auth.service.ts`, `backoffice/src/contexts/auth/auth.context.ts`, and `backoffice/src/contexts/auth/auth.provider.ts`; keep interfaces in each app's `src/interfaces/`.
- [ ] T027 Implement protected collaborator/backoffice routes, role-aware navigation, and logout handling in `collaborator/src/router/ProtectedRoute.tsx`, `collaborator/src/router/index.tsx`, `backoffice/src/router/ProtectedRoute.tsx`, and `backoffice/src/router/index.tsx`.
- [ ] T028 Implement callable/HTTP authorization guards that revalidate active user, tenant claim, role, and professional scope for every protected operation in `functions/src/services/authorization.service.ts` and `functions/src/functions/index.ts`.

**Checkpoint**: Staff sign-in and route access are independently testable against emulator
users from separate tenants.

---

## Phase 4: User Story 1 - Discover a company and request an appointment (Priority: P1)

**Goal**: Let public customers discover businesses, inspect their public catalog, find valid
availability, and create pending appointment requests.

**Independent Test**: As an unauthenticated customer, filter public companies, browse one
company's active products, select one or multiple eligible professionals as appropriate,
and create a valid pending appointment; verify invalid and concurrent overlapping requests
are rejected.

### Tests for User Story 1

- [x] T029 [P] [US1] Test company segment filters, catalog ownership, inactive products, empty states, and public-data minimization in `client/src/pages/CompanyListPage.spec.tsx` and `client/src/pages/CompanyCatalogPage.spec.tsx`.
- [x] T030 [P] [US1] Test professional choice for zero, one, and multiple eligible professionals and business-local availability results in `client/src/pages/BookingPage.spec.tsx`.
- [x] T031 [P] [US1] Test Brazilian phone validation, customer WhatsApp opt-in defaulting to false, success/error states, and submitted booking details in `client/src/components/organisms/BookingForm/BookingForm.spec.tsx`.
- [x] T032 [P] [US1] Test catalog ownership, public field allowlists, professional eligibility, working hours, blocked periods, stale availability, overlapping durations, and concurrent booking conflict outcomes in `functions/src/functions/appointments/create-public-appointment.spec.ts`.
- [x] T033 [P] [US1] Test public SSR response content, metadata, inactive catalog handling, and absence of private fields in `functions/src/functions/appointments/create-public-appointment.spec.ts`.

### Implementation for User Story 1

- [x] T034 Implement tenant-scoped public company discovery and segment filtering in `client/src/services/company.service.ts`, `client/src/interfaces/company.interface.ts`, and `client/src/pages/CompanyListPage.tsx`; return an empty state when no companies match.
- [x] T035 [P] [US1] Implement a public company catalog projection reader and product-card atom with image, name, optional description, and price in `client/src/services/catalog.service.ts`, `client/src/interfaces/product.interface.ts`, and `client/src/components/atoms/Card/index.tsx`.
- [x] T036 [P] [US1] Add the colocated Vitest component test for the Card atom in `client/src/components/atoms/Card/Card.spec.tsx`.
- [x] T037 Implement the business catalog view and active-product filtering in `client/src/pages/CompanyCatalogPage.tsx`, using the reusable `client/src/components/atoms/Card/index.tsx` to render catalog entries.
- [x] T038 Implement eligible-professional selection and automatic selection for exactly one eligible option in `client/src/components/organisms/ProfessionalSelector/ProfessionalSelector.tsx` and `client/src/services/professional.service.ts`.
- [x] T039 Implement business-timezone availability listing using service duration, configured booking interval, working hours, pending/confirmed appointments, blocked periods, and active associations in `client/src/services/availability.service.ts` and `functions/src/functions/appointments/list-availability.ts`.
- [x] T040 Implement validated customer booking UI, Brazilian DDD phone input, optional business-specific WhatsApp consent, and actionable result states in `client/src/components/organisms/BookingForm/BookingForm.tsx`, `client/src/interfaces/appointment.interface.ts`, and `client/src/pages/BookingPage.tsx`.
- [x] T041 Implement trusted appointment creation and deterministic five-minute reservation keys for every intersecting half-open service interval in `functions/src/functions/appointments/create-public-appointment.ts` and `functions/src/services/booking.service.ts`; quote and enforce the data-model rules "`id` deterministic from tenant, professional, and UTC 5-minute bucket", "`startsAt < endsAt`", and "`status` is `pending`, `confirmed`, `cancelled`, or `completed`".
- [ ] T042 Implement the Vite-compatible storefront renderer with route-specific title, description, canonical URL, Open Graph metadata, and public business/service HTML in `functions/src/functions/storefront/render-storefront.ts`, `client/src/entry-server.tsx`, and `firebase.json`; never render private tenant fields.

**Checkpoint**: Public discovery and a pending booking work in emulator-backed acceptance
tests; concurrent overlap cannot produce two accepted appointments.

---

## Phase 5: User Story 3 - Administer a company and its services (Priority: P1)

**Goal**: Let authorized backoffice users maintain business catalog, collaborators,
professional assignments, working hours, and blocked periods.

**Independent Test**: As an authorized backoffice user, create/edit/deactivate a product and
professional, associate them within one tenant, configure valid hours and a blocked period,
and verify those settings affect the public catalog and availability.

### Tests for User Story 3

- [x] T043 [P] [US3] Test product creation/edit validation, price and commission boundaries, image metadata, and active-state effects in `functions/src/functions/products/manage-product.spec.ts`.
- [x] T044 [P] [US3] Test same-tenant professional-product associations, collaborator profile validation, and historical records after deactivation/removal in `functions/src/functions/users/manage-professional.spec.ts`.
- [x] T045 [P] [US3] Test working-hour interval validation, timezone interpretation, blocked periods, and rejection of cross-tenant writes in `functions/src/functions/availability/manage-schedule.spec.ts`.
- [x] T046 [P] [US3] Test product editor and collaborator/schedule forms, validation, loading, success, and error states in `backoffice/src/pages/ProductsPage.spec.tsx`, `backoffice/src/pages/ProfessionalsPage.spec.tsx`, `backoffice/src/pages/AvailabilityPage.spec.tsx`, and `backoffice/src/pages/CompanySettingsPage.spec.tsx`.

### Implementation for User Story 3

- [x] T047 Implement typed product administration operations for tenant-owned product name, image, description, duration, non-negative `priceCents`, `commissionType` of `percentage` or `fixed`, non-negative commission, percentage maximum 10,000 basis points, and active state in `functions/src/functions/backoffice/manage-company.ts` and `functions/src/services/backoffice.service.ts`.
- [x] T048 Implement backoffice product list/editor and product image state using design-system components in `backoffice/src/pages/ProductsPage.tsx`, `backoffice/src/components/organisms/ProductEditor/ProductEditor.tsx`, `backoffice/src/services/admin.service.ts`, and `backoffice/src/interfaces/admin.interface.ts`.
- [x] T049 Implement collaborator profile create/edit and same-tenant professional-product associations in `functions/src/functions/backoffice/manage-company.ts` and `functions/src/services/backoffice.service.ts`; enforce unique `(tenantId, professionalId, productId)` associations and inactive-professional ineligibility.
- [x] T050 Implement backoffice collaborator/profile management, including required name, validated sensitive Brazilian phone, optional photo, active state, and product assignments in `backoffice/src/pages/ProfessionalsPage.tsx`, `backoffice/src/components/organisms/ProfessionalEditor/ProfessionalEditor.tsx`, and `backoffice/src/services/admin.service.ts`.
- [x] T051 Implement weekly working-hours management in `functions/src/functions/backoffice/manage-company.ts` and `backoffice/src/pages/AvailabilityPage.tsx`; enforce `dayOfWeek` 1-7, local `HH:mm`, `start < end`, and no overlapping active intervals for a professional and weekday.
- [x] T052 Implement one-time blocked-period management in `functions/src/functions/backoffice/manage-company.ts` and `backoffice/src/components/organisms/BlockedPeriodEditor/BlockedPeriodEditor.tsx`; enforce UTC `startsAt < endsAt` and same-tenant ownership.
- [x] T053 [P] [US3] Add business-segment management and public projection synchronization for company name, unique slug, configured segment, active state, and approved public description in `functions/src/functions/backoffice/manage-company.ts`, `functions/src/services/backoffice.service.ts`, and `backoffice/src/pages/CompanySettingsPage.tsx`.

**Checkpoint**: Backoffice changes are tenant-isolated and change the public catalog and
availability without rewriting historical appointment data.

---

## Phase 6: User Story 2 - Manage appointments and customer history (Priority: P1)

**Goal**: Let collaborators review and filter their authorized appointments, perform valid
status/schedule changes, contact customers, and inspect completed-attendance history.

**Independent Test**: As a scoped collaborator, filter appointments by business-local date,
confirm/cancel a pending booking, complete a confirmed booking, reschedule or reassign an
eligible appointment, and inspect completed attendance history; verify out-of-scope records
and invalid changes are denied.

### Tests for User Story 2

- [x] T054 [P] [US2] Test appointment listing by authorized tenant/professional/date, UI status actions, and empty states in `collaborator/src/pages/AppointmentsPage.spec.tsx`.
- [x] T055 [P] [US2] Test allowed and invalid status transitions, reschedule overlap, professional reassignment, and reservation release in `functions/src/functions/appointments/update-appointment.spec.ts`.
- [x] T056 [P] [US2] Test customer attendance count and latest completed attendance month/year, scoped to authorized appointments, in `functions/src/functions/customers/list-customers.spec.ts`.
- [x] T057 [P] [US2] Test collaborator customer list/history, consent-aware contact action, and protected phone display in `collaborator/src/pages/CustomersPage.spec.tsx`.

### Implementation for User Story 2

- [x] T058 Implement tenant-, professional-, status-, and business-local date-scoped appointment listing in `functions/src/functions/appointments/list-appointments.ts` and `collaborator/src/services/appointment.service.ts`.
- [x] T059 Implement appointment cards with customer, date, time, status, historical product image/name/price, and status-appropriate actions in `collaborator/src/components/organisms/AppointmentCard/AppointmentCard.tsx` and `collaborator/src/pages/AppointmentsPage.tsx`.
- [x] T060 Implement business-timezone date filters, realtime appointment refresh where applicable, and subscription cleanup in `collaborator/src/pages/AppointmentsPage.tsx` and `collaborator/src/services/appointment.service.ts`.
- [x] T061 Implement authorized appointment status transition operations in `functions/src/functions/appointments/update-appointment-status.ts`; allow `pending → confirmed`, `pending → cancelled`, and `confirmed → completed`, and reject every other transition.
- [x] T062 Implement pending/confirmed schedule edits and eligible professional reassignment in `functions/src/functions/appointments/update-appointment.ts`; revalidate tenant, status, association, hours, blocks, and availability atomically while preserving immutable commercial snapshots.
- [x] T063 Implement collaborator reschedule/edit interaction and conflict feedback in `collaborator/src/components/organisms/AppointmentEditor/AppointmentEditor.tsx` and `collaborator/src/pages/AppointmentDetailsPage.tsx`.
- [x] T064 Implement customer aggregation from completed appointments, including authorized contact, completed attendance count, and latest attendance month/year in `functions/src/functions/customers/list-customers.ts` and `functions/src/services/customer-history.service.ts`.
- [x] T065 Implement collaborator customer history and consent-aware WhatsApp contact actions in `collaborator/src/pages/CustomersPage.tsx`, `collaborator/src/components/organisms/CustomerHistory/CustomerHistory.tsx`, and `collaborator/src/services/customer.service.ts`.

**Checkpoint**: Collaborators can independently manage authorized bookings and customer
history; invalid transitions or reschedules leave existing appointments/reservations intact.

---

## Phase 7: User Story 4 - Review sales and commission reports (Priority: P2)

**Goal**: Provide transaction-derived monthly collaborator and backoffice reports, meaningful
rankings, filters, and matching exports.

**Independent Test**: Prepare appointments in every status around business-local month
boundaries, mutate current catalog terms, then verify collaborator totals, business
breakdowns, ranking threshold, and exported rows exactly match eligible completed
appointment snapshots.

### Tests for User Story 4

- [X] T066 [P] [US4] Test completed-only eligibility, snapshot calculations, percentage rounding, fixed commission, tenant scoping, and business-local month boundaries in `functions/src/functions/reports/calculate-sales-report.spec.ts`.
- [X] T067 [P] [US4] Test zero-result reports, product/period filters, CSV parity, privacy exclusions, and top-three threshold in `functions/src/functions/reports/export-sales-report.spec.ts`.
- [X] T068 [P] [US4] Test collaborator monthly report and backoffice dashboard/filter/export behavior in `collaborator/src/pages/ReportsPage.spec.tsx` and `backoffice/src/pages/ReportsPage.spec.tsx`.

### Implementation for User Story 4

- [X] T069 Implement pure completed-appointment sales and commission aggregation using snapshotted `productPriceCentsSnapshot`, commission basis points/cents, and half-up cent rounding in `shared/domain/commission.ts` and `shared/domain/reporting.ts`.
- [X] T070 Implement tenant/professional-scoped collaborator monthly sales and commission report in `functions/src/functions/reports/calculate-collaborator-report.ts` and `collaborator/src/services/report.service.ts`; define local month start/end from the business timezone.
- [X] T071 Implement backoffice period totals and sales breakdown by collaborator and product in `functions/src/functions/reports/calculate-sales-report.ts` and `backoffice/src/services/report.service.ts`; only completed appointment transactions count.
- [X] T072 Implement top-three ranking presentation only when at least three collaborators have eligible sales in the selected period in `backoffice/src/components/organisms/CollaboratorRanking/CollaboratorRanking.tsx` and `backoffice/src/pages/DashboardPage.tsx`.
- [X] T073 Implement a rebuildable monthly report projection partitioned by tenant, period, dimension type, and dimension ID in `functions/src/functions/reports/rebuild-monthly-report.ts` and `functions/src/services/monthly-report.service.ts`; appointments remain authoritative.
- [X] T074 Implement period/product/collaborator report filters, empty states, and UTF-8 CSV export with the same eligibility and calculation rules and without customer phone/message content in `functions/src/functions/reports/export-sales-report.ts` and `backoffice/src/pages/ReportsPage.tsx`.
- [X] T075 Implement collaborator monthly report presentation and business-local period selection in `collaborator/src/pages/ReportsPage.tsx` and `collaborator/src/components/organisms/MonthlyCommissionReport/MonthlyCommissionReport.tsx`.

**Checkpoint**: All role reports and exports reconcile to completed appointment snapshots;
ranking is not fabricated when fewer than three collaborators qualify.

---

## Phase 8: User Story 6 - Track operational contacts and messages (Priority: P3)

**Goal**: Support tenant-owned connections, contacts, and messages with consent-aware
WhatsApp verification/messaging and visible delivery state.

**Independent Test**: In emulator mode with a provider test double, verify a successful and
failed phone challenge, consent opt-in/opt-out, message delivery callbacks, duplicate
webhooks, realtime message updates, and denial of cross-tenant reads.

### Tests for User Story 6

- [ ] T076 [P] [US6] Test tenant-owned connection/contact creation, phone uniqueness, explicit opt-in, and opt-out behavior in `functions/src/functions/messages/manage-contact.spec.ts`.
- [ ] T077 [P] [US6] Test WhatsApp provider adapter success/failure, approved-template requirement, callback authentication, idempotency, and appointment-state non-interference in `functions/src/functions/messages/process-provider-webhook.spec.ts`.
- [ ] T078 [P] [US6] Test scoped realtime connection/contact/message views and delivery-state feedback in `collaborator/src/pages/MessagesPage.spec.tsx`.

### Implementation for User Story 6

- [ ] T079 Implement typed provider-neutral WhatsApp verification and messaging adapters in `functions/src/services/whatsapp-provider.service.ts` and `functions/src/services/whatsapp-provider.interface.ts`; keep all credentials server-side and document provider selection as deployment configuration.
- [ ] T080 Implement business-owned connection and tenant/connection-scoped contact operations in `functions/src/functions/messages/manage-connection.ts`, `functions/src/functions/messages/manage-contact.ts`, and `functions/src/services/contact.service.ts`; enforce unique phone per tenant/connection and default `whatsappOptIn` to false.
- [ ] T081 Implement appointment-message sending after transaction commit, immediately checking business-specific opt-in and provider template/window rules in `functions/src/functions/messages/send-appointment-message.ts` and `functions/src/services/message.service.ts`.
- [ ] T082 Implement authenticated, idempotent provider webhooks mapping message statuses to `pending`, `sent`, `delivered`, `read`, or `failed` in `functions/src/functions/messages/process-provider-webhook.ts`; message events must never mutate appointment status.
- [ ] T083 Implement tenant-scoped contact/message subscriptions, delivery states, and cleanup in `collaborator/src/services/message.service.ts` and `collaborator/src/pages/MessagesPage.tsx`.

**Checkpoint**: Messaging is consent-gated and observable; provider failures do not silently
alter appointment status or expose provider secrets.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Validate accessible user flows, tenant isolation, SEO rendering, emulator-first
configuration, and production deployment readiness across stories.

- [ ] T084 [P] Document palette, semantic colors, responsive tokens, accessibility, and component usage in `design-system.md`; verify all three applications consume the centralized token configuration in `shared/domain/design-tokens.ts`.
- [ ] T085 [P] Implement and colocate reusable atom/molecule tests, including `client/src/components/atoms/Card/Card.spec.tsx`, `client/src/components/molecules/`, `collaborator/src/components/molecules/`, and `backoffice/src/components/molecules/`.
- [ ] T086 [P] Audit every Firestore collection and query for root-level-only layout, explicit tenant ownership, tenant-constrained query shape, role scope, and appropriate indexes in `firestore.rules`, `firestore.indexes.json`, and `functions/src/services/authorization.service.ts`.
- [ ] T087 [P] Verify all frontend Firebase configurations use emulators by default in local development and do not use production until an explicit production configuration is selected in `client/src/config/firebase.ts`, `collaborator/src/config/firebase.ts`, `backoffice/src/config/firebase.ts`, and `.env.example`.
- [ ] T088 Validate Cloud Function region `southamerica-east1`, three Hosting targets, production configuration, valid public evaluation URLs, and deployment rollback procedure in `functions/src/index.ts`, `firebase.json`, `.firebaserc`, and `specs/001-saas-appointment-platform/quickstart.md`.
- [ ] T089 Validate crawlable business/service HTML, route metadata, Hosting rewrite precedence, public cache headers, and exclusion of private workspace data in `functions/src/functions/storefront/render-storefront.ts` and `firebase.json`.
- [ ] T090 Run the complete emulator-backed critical-flow suite for booking conflicts, cross-tenant denial, status transitions, commissions, reports, exports, and WhatsApp failures in `functions/test/acceptance/critical-flows.spec.ts`.
- [ ] T091 Validate keyboard access, semantic labels, focus behavior, mobile/desktop responsive layouts, and loading/empty/success/error states in `client/src/test/accessibility/`, `collaborator/src/test/accessibility/`, and `backoffice/src/test/accessibility/`.
- [ ] T092 Confirm the deployed Firebase Hosting environment supports the complete customer-to-collaborator workflow and publish working evaluation URLs in `specs/001-saas-appointment-platform/quickstart.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No prerequisites; creates workspace/configuration and shared tokens.
- **Foundational (Phase 2)**: Depends on Setup; blocks all user stories.
- **User Stories (Phases 3-8)**: Depend on Setup and Foundational. Story dependencies are
  listed below; implement and validate each story before integrating dependent behavior.
- **Polish (Phase 9)**: Depends on all selected stories and is required before production
  evaluation deployment.

### User Story Dependencies

- **US5 (P1) Authentication**: Starts after Phase 2. Required before protected US2, US3, US4,
  and authenticated US6 workflows; independent of public browsing.
- **US1 (P1) Public booking**: Starts after Phase 2. Can be validated with emulator fixtures;
  production onboarding depends on US3 company/catalog/availability management.
- **US3 (P1) Backoffice administration**: Starts after Phase 2 and US5 for real authenticated
  administration. US1 booking can use seeded fixtures before this story is complete.
- **US2 (P1) Collaborator operations**: Depends on US5 authentication and US1 appointments;
  it can be developed against seeded appointment fixtures.
- **US4 (P2) Reports**: Depends on appointment state and snapshots from US1/US2 and
  commercial configuration from US3.
- **US6 (P3) Messages**: Depends on US5 identity and US1/US2 customer/appointment records;
  business-specific connection setup is delivered in this story.

### Within Each User Story

- Write the listed Vitest component/backend tests before implementation and confirm they fail
  for the missing behavior.
- Define typed model/interface contracts before consuming UI/service integrations.
- Keep UI tests colocated with the component; keep backend tests alongside the function/module
  they exercise.
- Complete the independent test criteria before marking the story done.

### Parallel Opportunities

- **Setup**: T002-T008 can proceed in parallel after T001 establishes the workspace paths.
- **Foundational**: T009, T010, T012-T018, and T020 can be split by distinct files after
  T001/T002; T011 and T019 should follow the models/contracts they use.
- **US5**: T021-T023 are independent test files. T026's collaborator and backoffice auth
  files can be developed in parallel once T024/T025 define the contract.
- **US1**: T029-T033 are independent tests. T034/T035 can proceed separately after the
  public projection contract is fixed; SSR work T042 is separable from booking transactions.
- **US3**: T043-T046 are independent tests. Product, professional, schedule, and tenant
  management tasks can proceed in parallel after auth and persistence foundations.
- **US2**: T054-T057 are independent test files. Appointment listing/cards and customer
  history can proceed separately; lifecycle and schedule-edit operations share reservation
  invariants and should be coordinated.
- **US4**: T066-T068 are independent tests. Report views can be implemented separately after
  T069 establishes the calculation contract.
- **US6**: T076-T078 are independent tests. Connection/contact operations and webhook handling
  can proceed separately once T079 defines the provider contract.
- After their declared dependencies, different user stories can be assigned to separate
  contributors.

### Parallel Example: User Story 1

```text
Run independent tests together:
T029 Company discovery and catalog tests in client/src/pages/*.spec.tsx
T032 Booking conflict tests in functions/src/functions/appointments/create-public-appointment.spec.ts
T033 Public SSR tests in functions/src/functions/storefront/render-storefront.spec.ts

Develop independent surfaces after contracts are agreed:
T034 Discovery page/service in client/src/services/company.service.ts and CompanyListPage.tsx
T042 SSR renderer in functions/src/functions/storefront/render-storefront.ts
```

---

## Implementation Strategy

### MVP First (Public Booking Story)

1. Complete Phase 1 Setup and Phase 2 Foundational.
2. Complete US1 public discovery, catalog, availability, and pending booking with emulator
   fixtures. Add US3 only as needed to support real business setup; otherwise use controlled
   seed fixtures for the MVP demonstration.
3. Validate invalid phone/service/time, one/multiple/no eligible professionals, cross-tenant
   public reads, and concurrent overlapping bookings.
4. **Stop and validate** the customer journey independently before expanding to staff
   operations.

### Incremental Delivery

1. Setup + Foundational → emulator-backed, tenant-safe application foundation.
2. US5 → verified staff identity and role-gated workspaces.
3. US1 → public catalog and booking MVP.
4. US3 → backoffice-owned catalog, staff, and availability instead of seed-only data.
5. US2 → collaborator appointment and customer operations.
6. US4 → reconciled sales, commission, ranking, and export.
7. US6 → consent-aware business messaging and delivery tracking.
8. Polish → accessibility, SEO, security, production Hosting, and complete deployed flow.

### Parallel Team Strategy

1. Complete Setup and shared security/domain foundation together.
2. Assign US5 authentication, US1 public discovery/booking, and US3 backoffice administration
   to separate contributors after the shared contracts and emulator fixtures are stable.
3. Assign US2 after appointment contracts are stable; assign US4 after transaction snapshot
   and status rules are locked; assign US6 after consent/provider contracts are approved.
4. Integrate and run the cross-tenant, concurrency, reporting-reconciliation, and deployed
   end-to-end checks before release.

---

## Format Validation

- Every task uses `- [ ] Tnnn`.
- `[P]` appears only on tasks suitable for independent parallel execution.
- `[USn]` appears on every user-story task and not on setup, foundational, or polish tasks.
- Every task description contains a concrete target file path.
