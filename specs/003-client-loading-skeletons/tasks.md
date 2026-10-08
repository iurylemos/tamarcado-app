---
description: "Implementation tasks for client loading skeletons and booking flow guidance"
---

# Tasks: Client Loading Skeletons and Booking Flow Guidance

**Input**: Design documents from `specs/003-client-loading-skeletons/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, and `quickstart.md`

**Tests**: Targeted tests are included because the approved feature design explicitly requests them.

**Organization**: Tasks are grouped by user story so loading states, scroll guidance, and booking component boundaries can be validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because the task edits files independent of other incomplete tasks.
- **[Story]**: User story from `spec.md`.
- Every task includes exact client source/test paths.

## Path Conventions

- Client source: `client/src/`
- Client tests: colocated `*.spec.tsx` files in `client/src/`
- Feature validation guide: `specs/003-client-loading-skeletons/quickstart.md`

---

## Phase 1: Setup

**Purpose**: No project setup is required; the client workspace, skeleton primitives, and test harness already exist.

---

## Phase 2: Foundational

**Purpose**: No blocking shared infrastructure is required. The existing skeleton atom/molecule and test utilities are sufficient to begin the user stories.

---

## Phase 3: User Story 1 - Understand Client Loading States (Priority: P1) - MVP

**Goal**: Show content-shaped skeleton feedback across client screen and action loading states while retaining accessible status announcements and current error/empty behavior.

**Independent Test**: Hold discovery, catalog, booking, global operation, and submission work pending; verify appropriate skeletons and no visible loading copy/spinner, then resolve/fail the work and verify the existing ready/error/empty states replace the skeletons.

### Tests for User Story 1

- [X] T001 [P] [US1] Assert pending discovery and catalog show card skeletons without visible loading copy in `client/src/pages/CompanyListPage.spec.tsx` and `client/src/pages/CompanyCatalogPage.spec.tsx`.
- [X] T002 [P] [US1] Add a pending-operation test for the global skeleton overlay, hidden status announcement, and completion cleanup in `client/src/contexts/LoadingContext.spec.tsx`.
- [X] T003 [P] [US1] Assert the booking submit control uses skeleton feedback while busy, remains disabled, and retains an accessible name in `client/src/components/organisms/BookingForm/BookingForm.spec.tsx`.
- [X] T004 [US1] Extend booking loading tests for pending availability and next-date search; assert time skeletons replace visible progress copy and are removed on completion/error in `client/src/pages/BookingPage.spec.tsx`.

### Implementation for User Story 1

- [X] T005 [US1] Replace the visible spinner/message in `client/src/contexts/LoadingContext.tsx` with a decorative skeleton panel and concise visually hidden live status, adding required styles in `client/src/styles/index.css`.
- [X] T006 [US1] Replace the busy-state label in `client/src/components/organisms/BookingForm/BookingForm.tsx` with an accessible skeleton placeholder and add its layout styles in `client/src/styles/index.css`.
- [X] T007 [US1] Replace visible next-date search progress copy with a suitable skeleton and hidden status announcement in `client/src/components/templates/BookingTemplate/BookingTemplate.tsx`; preserve existing discovery, catalog, booking, empty, and error behavior.

**Checkpoint**: Discovery, catalog, booking availability, global operations, and submission provide skeleton-based visual feedback, with accessible announcements and unchanged terminal states.

---

## Phase 4: User Story 2 - Continue Directly to Customer Details (Priority: P1)

**Goal**: Bring “2. SEUS DADOS” into view when the customer first selects an available time, without stealing focus or repeating the scroll when changing an existing selection.

**Independent Test**: Select a time and verify one scroll to details without focus movement; change the selection and verify no repeated automatic scroll; enable reduced motion and verify immediate scrolling.

### Tests for User Story 2

- [X] T008 [US2] Cover initial selection, changing an already selected time, reduced-motion behavior, and unchanged focus in `client/src/pages/BookingPage.spec.tsx`.

### Implementation for User Story 2

- [X] T009 [US2] Ensure the selected-time transition scrolls the customer-details target exactly once, uses immediate behavior for reduced motion, and does not move focus in `client/src/components/templates/BookingTemplate/BookingTemplate.tsx`.

**Checkpoint**: Customers are guided to the details step only on the first empty-to-selected transition and can still change their selection without disruptive scrolling.

---

## Phase 5: User Story 3 - Follow a Clear Booking Flow (Priority: P2)

**Goal**: Separate the booking summary, availability, customer details, and receipt presentation while preserving the current state/callback boundary and user-visible behavior.

**Independent Test**: Complete the booking flow and verify all four sections, their existing labels and content, time selection, customer validation/consent, receipt details, and receipt actions remain functional.

### Tests for User Story 3

- [X] T010 [US3] Add or strengthen booking-flow regression assertions for the service summary, availability, details form, and receipt actions in `client/src/pages/BookingPage.spec.tsx`.

### Implementation for User Story 3

- [X] T011 [US3] Extract the business/product summary and its display into `client/src/components/organisms/BookingServiceSummary/BookingServiceSummary.tsx`, then compose it from `client/src/components/templates/BookingTemplate/BookingTemplate.tsx`.
- [X] T012 [US3] Extract date, professional, availability/loading, and time selection controls into `client/src/components/organisms/BookingAvailability/BookingAvailability.tsx`, preserving their existing props and callbacks from `client/src/components/templates/BookingTemplate/BookingTemplate.tsx`.
- [X] T013 [US3] Extract the conditional “2. SEUS DADOS” section, scroll target, and `BookingForm` composition into `client/src/components/organisms/BookingCustomerDetails/BookingCustomerDetails.tsx`, preserving its behavior from `client/src/components/templates/BookingTemplate/BookingTemplate.tsx`.
- [X] T014 [US3] Extract the animated appointment receipt dialog and its share/close actions into `client/src/components/organisms/BookingReceiptDialog/BookingReceiptDialog.tsx`, composing it from `client/src/components/templates/BookingTemplate/BookingTemplate.tsx`.

**Checkpoint**: `BookingTemplate` composes focused booking sections, while `BookingPage` remains the owner of fetching and booking state.

---

## Phase 6: Polish and Cross-Cutting Validation

**Purpose**: Confirm the approved quickstart scenarios and ensure the client remains type-safe and buildable.

- [X] T015 Run the focused tests and `npm run build` from `client/` using `specs/003-client-loading-skeletons/quickstart.md`; fix regressions in the affected client files.

---

## Dependencies and Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No tasks; the existing client workspace is ready.
- **Foundational (Phase 2)**: No tasks; existing skeleton and test infrastructure is ready.
- **User Stories (Phases 3-5)**: US1 and US2 are P1. US3 is P2 and follows the scroll behavior work because the extraction relocates the details scroll target.
- **Polish (Phase 6)**: Depends on all user stories being complete.

### User Story Dependencies

- **US1 (P1)**: Independent after the existing client skeleton primitives; delivers the loading-feedback MVP.
- **US2 (P1)**: Independent in behavior, but execute after US1 because both update booking loading/scroll presentation and the shared booking tests.
- **US3 (P2)**: Execute after US2 so the scroll behavior is established before its target is extracted into the customer-details organism.

### Within Each User Story

- Write or extend tests before changing the corresponding implementation.
- Keep state and service requests in `BookingPage`; presentation components receive explicit props and callbacks.
- Extract booking sections sequentially because each step updates the same `BookingTemplate.tsx` composition.
- Complete each checkpoint before moving to the next story.

### Parallel Opportunities

- T001, T002, and T003 can run in parallel because they edit separate test files.
- Within US1 implementation, T005 and T006 can be developed independently at the component level; coordinate CSS edits in `client/src/styles/index.css` to avoid conflicts.
- US2 test work can be prepared independently of the loading context/form tests, but should land after T004 because both touch `BookingPage.spec.tsx`.
- US3 organism extraction tasks are intentionally sequential because each changes the shared template composition.

## Parallel Example: User Story 1

```text
Task: T001 - Discovery/catalog skeleton assertions in CompanyListPage.spec.tsx and CompanyCatalogPage.spec.tsx
Task: T002 - Global loading overlay assertions in LoadingContext.spec.tsx
Task: T003 - Busy submit control assertions in BookingForm.spec.tsx
```

## Parallel Example: User Story 2

```text
Task: T008 - Add scroll-transition and reduced-motion assertions in BookingPage.spec.tsx
```

## Implementation Strategy

1. Deliver US1 as the MVP: tests first, then skeleton feedback for all loading surfaces.
2. Complete US2 and verify automatic scrolling does not move focus or repeat during time changes.
3. Complete US3 by extracting the booking sections in sequence while preserving the existing page/template boundary.
4. Run the focused client suite and production build as the final checkpoint.
