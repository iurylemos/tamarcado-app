---
description: "Implementation tasks for client catalog and booking UX improvements"
---

# Tasks: Client Catalog and Booking UX Improvements

**Input**: User-requested changes for `client/`, with platform architecture and behavior
grounded in `specs/001-saas-appointment-platform/plan.md` and
`specs/001-saas-appointment-platform/spec.md`.

**Scope**: This file defines implementation work for `client/` only. It does not include
changes to `collaborator/`, `backoffice/`, shared domain code, or backend services. Per
request, no feature specification, implementation plan, or product code is created here.

**Tests**: Use the existing Vitest and Testing Library setup in `client/package.json` and
`client/src/test/`. Add targeted tests for the requested client behavior.

**Organization**: Tasks are grouped by user story so each UX improvement can be implemented
and validated incrementally.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: The task can run in parallel with other marked tasks after its prerequisites.
- **[Story]**: The user story the task implements.
- Every task identifies its target file or files relative to the repository root.

## Path Conventions

- Client application source: `client/src/`
- Client tests: colocated `*.spec.tsx` files under `client/src/`
- Client PWA/build configuration: `client/vite.config.ts` and `client/index.html`

---

## Phase 1: Setup

**Purpose**: No project initialization is required; the client React, TypeScript, Vite, PWA,
and Vitest setup already exists in `client/package.json` and `client/vite.config.ts`.

---

## Phase 2: Foundational Components

**Purpose**: Create reusable atomic-design skeleton primitives before wiring loading states
into individual client pages.

- [X] T001 Create an accessible, reduced-motion-aware Skeleton atom in `client/src/components/atoms/Skeleton/Skeleton.tsx` and its styles in `client/src/styles/index.css`.
- [X] T002 Create a reusable card-layout SkeletonCard molecule with image, title, and metadata variants in `client/src/components/molecules/SkeletonCard/SkeletonCard.tsx`.

**Checkpoint**: Skeleton primitives are available to every client page and template.

---

## Phase 3: User Story 1 - Show Card Skeletons While Client Content Loads (Priority: P1)

**Goal**: Replace page-level loading text/spinners for card-based content with card-shaped
skeletons, while retaining appropriate progress feedback for non-card actions.

**Independent Test**: Hold each catalog, discovery, and availability request pending; verify
that its content area displays skeleton cards, then verify skeletons disappear when data,
an error, or an empty state is rendered.

### Tests for User Story 1

- [X] T003 [P] [US1] Add pending, resolved, error, and empty-state skeleton assertions to `client/src/pages/CompanyListPage.spec.tsx`, `client/src/pages/CompanyCatalogPage.spec.tsx`, and `client/src/pages/BookingPage.spec.tsx`; add primitive rendering/accessibility coverage in `client/src/components/molecules/SkeletonCard/SkeletonCard.spec.tsx`.

### Implementation for User Story 1

- [X] T004 [P] [US1] Render product/store card skeletons for pending discovery queries in `client/src/pages/CompanyListPage.tsx`, using the shared skeleton components.
- [X] T005 [P] [US1] Render service-card skeletons while the company catalog is pending in `client/src/pages/CompanyCatalogPage.tsx`, using the shared skeleton components.
- [X] T006 [P] [US1] Render card-shaped skeletons for pending booking details and available-time choices in `client/src/pages/BookingPage.tsx`; preserve the existing error and empty states and submission progress feedback.

**Checkpoint**: Each card-based loading state in the client discovery, catalog, and booking
flows has an accessible skeleton presentation.

---

## Phase 4: User Story 2 - Compose Page Content Through Atomic-Design Templates (Priority: P1)

**Goal**: Keep route/data orchestration in page components and move page presentation and
component composition into `client/src/components/templates/`.

**Independent Test**: Render each route with representative data and verify its template
preserves current discovery, catalog, booking, loading, error, empty, and success behavior.

### Tests for User Story 2

- [X] T007 [P] [US2] Add template composition and route-regression assertions to `client/src/pages/CompanyListPage.spec.tsx`, `client/src/pages/CompanyCatalogPage.spec.tsx`, and `client/src/pages/BookingPage.spec.tsx`.

### Implementation for User Story 2

- [X] T008 [P] [US2] Create `CompanyListTemplate` in `client/src/components/templates/CompanyListTemplate/CompanyListTemplate.tsx` to compose discovery filters, tabs, result cards, loading, error, and empty states.
- [X] T009 [P] [US2] Create `CompanyCatalogTemplate` in `client/src/components/templates/CompanyCatalogTemplate/CompanyCatalogTemplate.tsx` to compose company identity, service cards, and catalog states.
- [X] T010 [P] [US2] Create `BookingTemplate` in `client/src/components/templates/BookingTemplate/BookingTemplate.tsx` to compose service summary, date/professional/time selection, customer form, receipt, and booking states.
- [X] T011 [P] [US2] Refactor `client/src/pages/CompanyListPage.tsx` to pass query and filter state into `CompanyListTemplate` without moving data fetching into presentation components.
- [X] T012 [P] [US2] Refactor `client/src/pages/CompanyCatalogPage.tsx` and `client/src/entry-server.tsx` to render `CompanyCatalogTemplate` for client and server output, and remove or retire the duplicate HTML-string rendering in `client/src/services/public-content-markup.ts` while preserving crawlable catalog links and content.
- [X] T013 [P] [US2] Refactor `client/src/pages/BookingPage.tsx` to pass booking state and actions into `BookingTemplate`, keeping services, queries, and booking orchestration in the page layer.

**Checkpoint**: All page routes use templates for presentation, and existing public/server
catalog output and booking behavior remain intact.

---

## Phase 5: User Story 3 - Scroll to Customer Details After Time Selection (Priority: P1)

**Goal**: After a customer selects an available time, automatically bring the name and phone
form card into view without unexpectedly opening the mobile keyboard.

**Independent Test**: Select a time in a viewport where the customer form is below the fold;
verify the form scrolls into view once, remains usable, and is not shown before time selection.

### Tests for User Story 3

- [X] T014 [US3] Add a booking interaction test for selection-triggered form visibility and scrolling in `client/src/pages/BookingPage.spec.tsx`.

### Implementation for User Story 3

- [X] T015 [US3] Add a stable ref and selection-transition scroll behavior to `client/src/components/templates/BookingTemplate/BookingTemplate.tsx`, respecting reduced-motion preferences and avoiding focus/keyboard side effects.

**Checkpoint**: Choosing a time guides the customer directly to the name and phone form.

---

## Phase 6: User Story 4 - Automatically Choose the Nearest Available Date (Priority: P1)

**Goal**: If the selected day has no available professionals or times, automatically select the
nearest future day with availability instead of requiring the customer to press “Ver horários”.

**Independent Test**: Return no slots for the selected date and one or more later dates; verify
the nearest date is selected and its slots load automatically. Verify a date with slots is not
changed, and no result within the current 30-day search range leaves a clear message and lets
the customer choose another date.

### Tests for User Story 4

- [X] T016 [US4] Add tests for nearest-date auto-selection, retaining a date that already has slots, exhausted search, and stale searches in `client/src/pages/BookingPage.spec.tsx`.

### Implementation for User Story 4

- [X] T017 [US4] Update the next-availability flow in `client/src/pages/BookingPage.tsx` to select the first future date with slots automatically, cancel stale results, and preserve the existing 30-day search limit and manual date control.

**Checkpoint**: Customers are moved to the closest bookable date without an extra action, or
receive the existing no-results guidance when the search range is exhausted.

---

## Phase 7: User Story 5 - Open a Company-Specific Catalog From Its Installed PWA (Priority: P1)

**Goal**: When a user installs/opens the client PWA from `/empresa/{slug}`, launch directly into
that same company's catalog and allow the user to continue to booking rather than landing on
the general company list.

**Independent Test**: Install or add the PWA from a company catalog, launch it, and verify the
same slug opens and its service links lead to the correct booking route; verify the general
PWA entry continues to open `/`.

### Tests for User Story 5

- [X] T018 [US5] Add company-slug PWA entry and catalog-to-booking route assertions in `client/src/pages/CompanyCatalogPage.spec.tsx`; create `client/src/App.spec.tsx` for route-level launch coverage.

### Implementation for User Story 5

- [X] T019 [US5] Create `client/src/services/pwa-manifest.service.ts` to generate a company-scoped PWA manifest whose `start_url` is `/empresa/{slug}`, while retaining `/` for the general manifest.
- [X] T020 [US5] Connect the company-scoped manifest to `client/src/components/templates/CompanyCatalogTemplate/CompanyCatalogTemplate.tsx` and configure `client/index.html` and `client/vite.config.ts` so a PWA installed from a catalog uses its slug at launch without changing the general `/` entry.

**Checkpoint**: The catalog slug is retained for PWA launches and the customer can schedule
from that company-specific entry.

---

## Phase 8: User Story 6 - Return to the Catalog With One Tap on iOS (Priority: P2)

**Goal**: Make “Voltar ao catálogo” return to the company catalog on a single tap in iOS Safari
and installed iOS PWAs.

**Independent Test**: From a booking route, tap “Voltar ao catálogo” once on the supported
iOS flow and verify immediate navigation to the matching `/empresa/{slug}` route; verify the
link remains keyboard-accessible and does not cause duplicate navigation.

### Tests for User Story 6

- [X] T021 [US6] Add a one-activation back-navigation assertion from booking to the matching catalog in `client/src/pages/BookingPage.spec.tsx`.

### Implementation for User Story 6

- [X] T022 [US6] Correct the catalog-back interaction in `client/src/components/templates/BookingTemplate/BookingTemplate.tsx` so one activation performs one client-side navigation to `/empresa/{slug}` in Safari/iOS PWA without requiring a second tap.

**Checkpoint**: Customers return to the right catalog with one activation on iOS and other
supported browsers.

---

## Phase 9: Polish & Cross-Cutting Validation

**Purpose**: Validate that all requested client behaviors work together without changing
other applications.

- [ ] T023 Run the existing client tests and production build from `client/package.json`, and manually verify PWA launch and one-tap catalog navigation in iOS Safari/iOS PWA using `client/src/App.tsx` routes.

  Automated client tests, production build, and route/manifest assertions passed. Physical iOS Safari/iOS PWA verification is not available in this environment.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No setup tasks; the client project and test tooling already exist.
- **Foundational (Phase 2)**: Complete T001 and T002 before implementing page-level skeletons.
- **User Story 1 (Phase 3)**: Depends on the foundational skeleton components.
- **User Story 2 (Phase 4)**: Depends on User Story 1 so the page migration carries forward the new loading states.
- **User Story 3 (Phase 5)**: Depends on the booking template from T010 and page integration from T013.
- **User Story 4 (Phase 6)**: Depends on the booking page/template integration from User Story 2; implement separately from User Story 3 because both change booking behavior and tests.
- **User Story 5 (Phase 7)**: Depends on `CompanyCatalogTemplate` from T009 and the catalog migration from T012; T020 follows the manifest service in T019.
- **User Story 6 (Phase 8)**: Depends on `BookingTemplate` from T010 and booking migration from T013; sequence after User Story 3 to avoid overlapping edits to the same template.
- **Polish (Phase 9)**: Depends on all selected user stories.

### User Story Dependencies

- **US1 (P1)**: Starts after the foundational skeleton components.
- **US2 (P1)**: Follows US1 to preserve skeleton behavior through the template refactor.
- **US3 (P1)** and **US4 (P1)**: Both depend on US2 and touch booking behavior; schedule them sequentially.
- **US5 (P1)**: Depends on the company catalog template and page migration in US2.
- **US6 (P2)**: Depends on the booking template and page migration in US2; schedule after US3.

### Parallel Opportunities

- T004, T005, and T006 can be implemented in parallel after T003 and the foundational tasks because they target separate client pages.
- T008, T009, and T010 can be implemented in parallel after T007 because each creates a template in a separate directory.
- T011, T012, and T013 can be integrated in parallel after their corresponding templates are ready because they target distinct page/server-rendering files.
- US5 manifest generation (T019) can proceed in parallel with US3/US4 after US2; wire the catalog template in T020 after US2 and T019.

### Parallel Example: User Story 1

```text
After T001-T003:
Task: T004 Add discovery card skeletons in client/src/pages/CompanyListPage.tsx
Task: T005 Add catalog card skeletons in client/src/pages/CompanyCatalogPage.tsx
Task: T006 Add booking loading skeletons in client/src/pages/BookingPage.tsx
```

### Parallel Example: User Story 2

```text
After T007:
Task: T008 Create CompanyListTemplate in client/src/components/templates/CompanyListTemplate/CompanyListTemplate.tsx
Task: T009 Create CompanyCatalogTemplate in client/src/components/templates/CompanyCatalogTemplate/CompanyCatalogTemplate.tsx
Task: T010 Create BookingTemplate in client/src/components/templates/BookingTemplate/BookingTemplate.tsx
```

### Parallel Examples: User Stories 3-6

- **US3**: Run T014 before T015; the story has no safe parallel implementation tasks.
- **US4**: Run T016 before T017; the story has no safe parallel implementation tasks.
- **US5**: Run T018 before T019, then T020; T019 can run in parallel with US3/US4 after US2.
- **US6**: Run T021 before T022; schedule it after US3 because both change the booking template.

---

## Implementation Strategy

1. Build the reusable skeleton primitives, then deliver card-level loading feedback as the
   first customer-visible increment.
2. Move page composition into atomic-design templates while preserving the improved loading,
   route, SSR, error, empty, and success behavior.
3. Deliver the booking interaction improvements: scroll to customer details and automatically
   choose the nearest available date.
4. Add company-specific PWA entry behavior and validate one-tap iOS catalog navigation.
5. Complete the client test suite, production build, and platform-specific manual checks.

**Suggested MVP**: Complete US1 (card-based loading skeletons) after the foundational
components; US2 is the next increment and required before the template-dependent PWA and
navigation changes.
