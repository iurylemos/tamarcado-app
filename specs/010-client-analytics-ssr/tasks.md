---

description: "Task list for client analytics and server-side rendering"

---

# Tasks: Analytics por Empresa e Renderização SSR do Cliente

**Input**: Design documents in `/specs/010-client-analytics-ssr/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, and `quickstart.md`

**Tests**: Included because FR-018 requires tests for events, calculations, authorization, rendering, and reports in the existing validation gates.

**Organization**: Tasks are grouped by approved user story. Every task has a concrete path and a sequential ID.

## Phase 1: Setup

**Purpose**: Confirm external prerequisites and prepare the Client workspace for the approved rendering stack.

- [ ] T001 Obtain approval for the analytics consent policy/text and confirm a non-production GA4/GTM property; record the decisions in `specs/010-client-analytics-ssr/research.md` and keep tags disabled until approved.
- [X] T002 [P] Validate compatible Vike, `vike-react`, and `vike-react-query` versions, then add the dependencies and required Client build scripts in `client/package.json` and `package-lock.json`.

## Phase 2: Foundational

**Purpose**: Prove the required SSR path and packaging before migrating all public Client routes. A failed compatibility gate blocks the full SSR migration.

- [X] T003 Add the local compatibility smoke test for Vike rendering, React Query hydration, and request isolation across two tenants in `client/src/entry-server.spec.tsx` and `specs/010-client-analytics-ssr/quickstart.md`.
- [X] T004 Implement the minimal Vike React rendering proof with a request-scoped `QueryClient` in `client/vite.config.ts`, `client/src/config/react-query.config.ts`, and the Vike page entry under `client/pages/`.
- [ ] T005 Package the Client server bundle with Functions and route only the Client public paths through the existing renderer in `functions/package.json`, `functions/src/functions/catalog/render-storefront.ts`, and `firebase.json`; run the smoke test in `specs/010-client-analytics-ssr/quickstart.md` and stop for a technical decision if streaming or tenant isolation fails.

## Phase 3: User Story 1 — Acessar o catálogo com conteúdo disponível (Priority: P1) — MVP

**Goal**: Serve the requested public Client route with matching public content in the initial response and preserve the existing booking authority.

**Independent Test**: Request `/`, a published business slug, an invalid slug, and a published service booking route in the demo Emulator Suite. Verify route-specific HTML, neutral root guidance, not-found behavior without cross-tenant content, and working client navigation after hydration.

### Tests for User Story 1

- [X] T006 [P] [US1] Cover direct SSR requests for root, published and invalid slugs, booking routes, hydration, and cross-request tenant isolation in `client/src/entry-server.spec.tsx` and `functions/src/functions/catalog/render-storefront.spec.ts`.

### Implementation for User Story 1

- [X] T007 [US1] Define Vike page routing for `/`, `/empresa/:slug`, and `/empresa/:slug/agendar/:productId` in `client/pages/`.
- [X] T008 [US1] Load only the published business and public product projections for slug and booking pages, returning a public not-found state for inactive or mismatched records, in `client/pages/empresa/@slug/+data.ts`, `client/pages/empresa/@slug/agendar/@productId/+data.ts`, and `functions/src/functions/catalog/render-storefront.ts`.
- [X] T009 [US1] Create a fresh server `QueryClient` per render, hydrate a separate browser client, and include slug/resource identifiers in relevant query keys in `client/src/config/react-query.config.ts` and `client/src/`.
- [X] T010 [US1] Implement explicit loading, empty, not-found, unavailable, and actionable error states without falling back to another tenant's cache in `client/pages/`.
- [X] T011 [US1] Preserve client-side navigation and the existing availability recheck and authoritative appointment creation flow while integrating hydrated SSR data in `client/src/pages/` and `client/src/services/`.
- [X] T012 [P] [US1] Preserve public metadata, static asset rewrites, PWA behavior, and existing Client error reporting for Vike responses in `client/vite.config.ts` and `firebase.json`.

## Phase 4: User Story 2 — Medir aquisição e comportamento do visitante (Priority: P1)

**Goal**: Collect allowlisted first-party journey events only after explicit analytics consent, while keeping external analytics global and privacy-safe.

**Independent Test**: In the demo Emulator Suite, simulate known campaign sources and funnel steps. Verify source and step counts, rejected invalid payloads, absence of collection before consent and after withdrawal, no personal or tenant identifiers in GA4/GTM payloads, and unaffected booking.

### Tests for User Story 2

- [ ] T013 [P] [US2] Test default-denied and withdrawn consent, consent independence from WhatsApp, event schema validation, source classification, and privacy-safe GTM payloads in `client/src/analytics/analytics.spec.ts` and `functions/src/functions/analytics/ingest-analytics.spec.ts`.

### Implementation for User Story 2

- [ ] T014 [US2] Add an accessible, changeable analytics preference defaulting to denied and independent of WhatsApp consent in `client/src/analytics/consent.ts` and `client/src/analytics/ConsentBanner.tsx`.
- [ ] T015 [US2] Define the allowlisted journey events, funnel steps, source categories, campaign sanitization, and anonymous session identifier generation in `client/src/analytics/events.ts`.
- [ ] T016 [US2] Load GA4/GTM only after consent and emit global events with normalized route templates and a single page-view source, excluding slug, service ID, tenant ID, contact data, appointment ID, and arbitrary query strings in `client/src/analytics/gtm.ts`.
- [ ] T017 [US2] Implement the public analytics callable to validate consent-gated event shape, published slug, active public service association, session, and frequency; resolve tenant server-side and persist only the tenant-scoped session in `functions/src/functions/analytics/ingest-analytics.ts` and `functions/src/config/collections.ts`.
- [ ] T018 [US2] Define the server-only `analytics_sessions` document shape, opaque session ID, 30-minute abandonment rule, and 90-day expiration/TTL configuration in `functions/src/model/analytics-session.ts`, `functions/src/config/collections.ts`, and `firestore.indexes.json`.
- [ ] T019 [US2] Link an optional analytics session to public appointment creation and mark `bookingCreated` only after a successful appointment commit; make analytics updates best-effort so they cannot fail or roll back booking in `functions/src/functions/appointments/create-public-appointment.ts`.
- [ ] T020 [US2] Apply the approved anti-abuse protection to the public analytics callable and verify malformed or repeated events cannot write cross-tenant data in `functions/src/functions/analytics/ingest-analytics.ts` and `functions/src/functions/analytics/ingest-analytics.spec.ts`.

## Phase 5: User Story 3 — Consultar indicadores operacionais e financeiros da empresa (Priority: P1)

**Goal**: Provide authorized business administrators with tenant-scoped journey and appointment indicators, with explicit distinction between estimated revenue and received payment.

**Independent Test**: Seed two businesses with known consented sessions and appointments across services, local times, statuses, historical prices, and customers. Compare dashboard aggregates to reference calculations and verify unauthorized cross-tenant requests return no target-tenant data or personal identifiers.

### Tests for User Story 3

- [ ] T021 [P] [US3] Test source and interest aggregates, appointment counts, local start-hour grouping, returning-customer counts, historical-price revenue, cancellation exclusion, authorization, and response privacy in `functions/src/services/analytics-dashboard.spec.ts` and `functions/src/functions/analytics/get-business-analytics.spec.ts`.

### Implementation for User Story 3

- [ ] T022 [P] [US3] Define UI-independent analytics result types and pure aggregation helpers for journey coverage, service interest, funnel counts, booking counts, hours, returning customers, and estimated revenue in `shared/domain/analytics.ts`.
- [ ] T023 [US3] Implement tenant-scoped dashboard calculations from consented `analytics_sessions` and authoritative appointments in `functions/src/services/analytics-dashboard.ts`; use `startsAt` in the business timezone, historical price snapshots, include pending/confirmed/completed, exclude cancelled, and compare E.164 values only in memory for completed-appointment return counts.
- [ ] T024 [US3] Implement an authenticated Backoffice callable that validates optional year/month, derives tenant only through `authorizeActor`, and returns aggregates without personal data, appointment IDs, or client-supplied tenant selection in `functions/src/functions/analytics/get-business-analytics.ts` and `functions/src/index.ts`.
- [ ] T025 [US3] Add the authenticated dashboard callable client and typed response handling in `backoffice/src/services/analytics.ts`.
- [ ] T026 [US3] Extend the existing business dashboard with distinct service-interest and booking indicators, journey coverage limited to consented visitors, estimated-revenue labeling, and loading/empty/error states in `backoffice/src/pages/DashboardPage.tsx`.

## Phase 6: User Story 4 — Consultar o resumo mensal da empresa (Priority: P2)

**Goal**: Generate an idempotent monthly analytics snapshot with supported opportunities and expose it only to authorized administrators in the dashboard.

**Independent Test**: Generate a closed month for a demo business, compare the snapshot with the period/timezone reference data, query as authorized and unauthorized administrators, rerun the same month, and simulate generation failure. Verify idempotency, privacy, opportunity evidence, and that partial results are not presented as success.

### Tests for User Story 4

- [ ] T027 [P] [US4] Test monthly period boundaries by business timezone, deterministic opportunities and insufficient samples, idempotent regeneration, sanitized generation failure, and authorized snapshot retrieval in `functions/src/functions/reports/generate-monthly-analytics-report.spec.ts` and `functions/src/functions/analytics/get-monthly-analytics-report.spec.ts`.

### Implementation for User Story 4

- [ ] T028 [P] [US4] Define the `monthly_analytics_reports` snapshot model and collection identifier, keeping it separate from `monthly_reports` and excluding per-customer or per-appointment data, in `functions/src/model/monthly-analytics-report.ts` and `functions/src/config/collections.ts`.
- [ ] T029 [US4] Implement monthly aggregation and deterministic, explainable opportunities tied to observed indicators; use the business IANA timezone, `startsAt` for appointment metrics, session dates for journey metrics, and suppress unsupported recommendations in `functions/src/services/monthly-analytics-report.ts`.
- [ ] T030 [US4] Implement scheduled generation for the closed month with deterministic tenant/year/month identity, idempotent replacement, sanitized failure recording, and no partial-success snapshot in `functions/src/functions/reports/generate-monthly-analytics-report.ts` and `functions/src/index.ts`.
- [ ] T031 [US4] Implement the authenticated monthly snapshot callable using `authorizeActor` and server-derived tenant scope, with validated period inputs and explicit missing/failed report states in `functions/src/functions/analytics/get-monthly-analytics-report.ts` and `functions/src/index.ts`.
- [ ] T032 [US4] Add the monthly summary view to the Backoffice dashboard, showing only aggregated indicators and evidence-linked opportunities with explicit loading, empty, and error states in `backoffice/src/pages/DashboardPage.tsx` and `backoffice/src/services/analytics.ts`.

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Validate privacy, existing booking/reporting behavior, and the release gates owned by Spec 009 without adding a parallel CI workflow.

- [ ] T033 [P] Document the final local/emulator commands and observable acceptance checks for SSR, hydration, consent, payload privacy, tenant isolation, metric reconciliation, TTL, and monthly report failure handling in `specs/010-client-analytics-ssr/quickstart.md`.
- [ ] T034 Integrate Client and Functions tests/builds plus emulator checks into the existing validation gates owned by Spec 009; do not create a separate workflow, and record the exact gate entry points in `specs/010-client-analytics-ssr/quickstart.md`.
- [ ] T035 Run the complete local release validation from `specs/010-client-analytics-ssr/quickstart.md`, including `npm run build --workspace client`, `npm run build --workspace functions`, workspace tests, `npm run test:emulator`, `npm run lint`, and `npm run format:check`; record results and confirm production Firebase/GA4/GTM state was not changed in `specs/010-client-analytics-ssr/quickstart.md`.

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies. T001 and T002 may proceed in parallel; analytics tags remain disabled until T001 is complete.
- **Foundational (Phase 2)**: Depends on Setup. The Vike streaming/hydration and tenant-isolation proof is a mandatory gate; a failure blocks full SSR migration and requires a technical decision rather than a silent technology substitution.
- **User Stories (Phase 3+)**: Depend on the Foundational phase.
- **Polish (Phase 7)**: Depends on all stories selected for release.

### User Story Dependencies

- **US1 (P1)**: Starts after Foundational; no dependency on another story. MVP scope.
- **US2 (P1)**: Starts after US1 because page-view normalization and funnel events are integrated with the Vike routes; consent and first-party collection remain optional to the booking flow.
- **US3 (P1)**: Depends on US2's first-party session schema and events, plus Foundational.
- **US4 (P2)**: Depends on US3's agreed metric calculations and authorized dashboard access.

### Parallel Opportunities

- T001 and T002 can run in parallel.
- Within US1, T006 can be prepared before route implementation; T012 can proceed independently from the data-loader and request-scoped QueryClient work once the Vike setup exists.
- Within US2, client consent/event tests and backend callable tests in T013 can be authored in parallel; event taxonomy (T015) and tag integration (T016) can proceed independently after consent requirements are approved.
- Within US3, pure domain calculation tests and UI integration can proceed in parallel after the callable response contract is agreed; backend tenant-scoped calculations must precede callable implementation.
- Within US4, snapshot model and generation tests can be prepared in parallel; scheduled generation must use the shared calculation contract before dashboard display is integrated.

## Parallel Example: User Story 1

```text
Prepare the route/SSR assertions in client/src/entry-server.spec.tsx and
functions/src/functions/catalog/render-storefront.spec.ts (T006).
In parallel, preserve the PWA/static asset and public metadata behavior in
client/vite.config.ts and firebase.json (T012) after the Foundational Vike setup.
Then implement the route loaders, request-scoped QueryClient, and explicit route states
(T007-T010) before validating the booking integration (T011).
```

## Parallel Example: User Story 2

```text
Author client consent/event tests in client/src/analytics/analytics.spec.ts and
server ingestion tests in functions/src/functions/analytics/ingest-analytics.spec.ts
(T013) in parallel.
After consent approval, implement the client preference and allowlisted taxonomy
(T014-T015) separately from the server session model and TTL configuration (T018).
Connect tags and ingestion only after their privacy-safe schemas are agreed (T016-T017).
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Setup and Foundational, including the mandatory Emulator Suite Vike compatibility gate.
2. Complete US1 to deliver SSR content for the root, published business, and booking routes.
3. Validate US1 independently using its direct-request and tenant-isolation criteria.
4. Do not proceed with full route migration if the required streaming/hydration proof fails; obtain a technical decision first.

### Incremental Delivery

1. Complete Setup + Foundational and retain the compatibility evidence.
2. Deliver US1 and validate the SSR customer journey independently.
3. Deliver US2, preserving booking when consent is absent, withdrawn, blocked, or analytics is unavailable.
4. Deliver US3 with tenant-authorized dashboard aggregates reconciled against source appointments.
5. Deliver US4 with idempotent closed-month snapshots and explicit generation failure states.
6. Complete the existing Spec 009 validation gates; do not deploy, change production Firebase/GA4/GTM state, or add email/Looker Studio scope.
