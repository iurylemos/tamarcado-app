---
description: "Executable task list for booking request performance"
---

# Tasks: Booking Request Performance

**Input**: Design documents from `specs/005-booking-request-performance/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`

**Scope**: This file defines implementation work only. No application code is included here.

**Tests**: Include focused tests because the plan and quickstart specify coverage for search bounds, booking validation, concurrency, deferred notifications, and timing/privacy behavior.

**Organization**: Tasks are grouped by user story and ordered so each story can be validated independently.

## Phase 1: Setup

**Purpose**: Use the existing client, Functions, shared-domain, Firestore, and emulator setup. The plan introduces no new runtime dependencies or project initialization.

No setup tasks are required.

---

## Phase 2: Foundational

**Purpose**: Identify cross-story prerequisites that must block all story work.

No additional shared foundation is required; existing application boundaries and booking infrastructure remain in place.

---

## Phase 3: User Story 1 - Find the next available time (Priority: P1)

**Goal**: Search the selected business-local date and up to 30 following dates in one operation, returning the earliest date with slots or a clear empty-window result.

**Independent Test**: Verify same-day availability, automatic selection of the earliest later date (including the final day in the 31-date window), a fully empty window, a newly selected date, and preserved single-day callable compatibility. Confirm date boundaries and overlapping records use the business timezone.

### Tests for User Story 1

- [X] T001 [P] [US1] Add callable/service coverage for the 31-date limit, earliest available date, empty window, timezone boundaries, overlap-aware records, and existing single-day compatibility in `functions/src/functions/appointments/create-public-appointment.spec.ts`
- [X] T002 [P] [US1] Cover same-day results, automatic date advancement, empty-window feedback, new date selection, and search failure behavior in `client/src/pages/BookingPage.spec.tsx`

### Implementation for User Story 1

- [X] T003 [P] [US1] Define bounded search input and result types while preserving the existing single-day availability types in `shared/domain/interfaces/availability.interface.ts`
- [X] T004 [US1] Resolve shared business/service/professional data once and evaluate availability over the requested business-local date plus the next 30 dates using overlap-aware range reads in `functions/src/services/availability.service.ts`
- [X] T005 [US1] Add and export the bounded `searchAvailability` callable with server-enforced window limits and existing error semantics in `functions/src/functions/appointments/search-availability.ts` and `functions/src/index.ts`
- [X] T006 [US1] Add the composite indexes required by the final date-range and overlap queries in `firestore.indexes.json`
- [X] T007 [US1] Add the bounded search request to the client availability service without changing the existing single-day operation in `client/src/services/availability.service.ts`
- [X] T008 [US1] Use the bounded search result to update the selected date and display its slots without issuing a second request for the automatically selected date in `client/src/pages/BookingPage.tsx`

**Checkpoint**: The customer can find the earliest available date in one bounded search, or receive a clear no-availability result; the legacy single-day operation remains available.

---

## Phase 4: User Story 2 - Submit an appointment request promptly (Priority: P1)

**Goal**: Validate the chosen slot on submission, atomically persist the pending appointment, reservations, and notification job, then return the existing receipt without waiting for notifications or availability refresh.

**Independent Test**: Delay notification processing and the post-booking refresh, then verify the pending appointment and all reservations are committed, the existing receipt appears promptly, provider failure does not undo the appointment, and overlapping concurrent requests cannot both succeed.

### Tests for User Story 2

- [X] T009 [P] [US2] Cover selected-slot revalidation, atomic appointment/reservation/job persistence, delayed or failed notification delivery, completed-job redelivery, and overlapping concurrent submissions in `functions/src/functions/appointments/create-public-appointment.spec.ts`
- [X] T010 [P] [US2] Verify the existing receipt appears and submission is no longer pending while notification delivery and availability refresh are delayed in `client/src/pages/BookingPage.spec.tsx`

### Implementation for User Story 2

- [X] T011 [US2] Define the notification job fields, allowed states, and sanitized failure summary in `functions/src/model/appointment-notification-job.model.ts`
- [X] T012 [US2] Reuse availability domain rules to validate only the requested start time, including eligibility, working hours, interval alignment, blocks, and current conflicts, in `functions/src/services/availability.service.ts`
- [X] T013 [US2] Create the pending notification job in the same transaction as the appointment and every intersecting reservation, and return the committed appointment result without a read-after-write or notification call in `functions/src/services/booking.service.ts`
- [X] T014 [US2] Process notification jobs from a Firestore-created event, load the appointment, preserve existing notification rules, record pending/completed/failed outcomes, skip completed jobs, and allow configured retries for worker execution failures in `functions/src/services/appointment-notification.service.ts` and `functions/src/functions/appointments/process-appointment-notification.ts`
- [X] T015 [US2] Export the notification worker through the Functions deployment entry point in `functions/src/index.ts`
- [X] T016 [US2] Show the existing receipt after successful registration, remove the booked slot locally, and refresh remaining availability without extending submission-pending state in `client/src/pages/BookingPage.tsx` and `client/src/services/appointment.service.ts`

**Checkpoint**: Appointment registration is authoritative and prompt; notification delivery is durable, separate, and cannot change the registered appointment result.

---

## Phase 5: User Story 3 - Recover from request failures (Priority: P2)

**Goal**: Keep availability failures, empty availability, invalid requests, and no-longer-available slots distinguishable so customers can retry or choose another time safely.

**Independent Test**: Simulate a failed availability request, invalid date, invalid booking request, and a slot taken by another customer. Verify no stale slots or success receipt are shown and existing actionable errors remain available.

### Tests for User Story 3

- [X] T017 [US3] Add failure scenarios for unavailable service/network responses, invalid dates, and a slot that is no longer available in `client/src/pages/BookingPage.spec.tsx` and `functions/src/functions/appointments/create-public-appointment.spec.ts`

### Implementation for User Story 3

- [X] T018 [US3] Preserve distinct error and empty-result handling, clear stale availability after a failed search, and suppress the success receipt when registration fails in `client/src/pages/BookingPage.tsx`, `client/src/services/availability.service.ts`, and `client/src/services/appointment.service.ts`

**Checkpoint**: Customers can distinguish an empty schedule from a failed request and can recover from booking conflicts without a false confirmation.

---

## Phase 6: User Story 4 - Identify slow booking requests (Priority: P2)

**Goal**: Distinguish availability-search, appointment-registration, and notification durations without logging customer names, phone numbers, or message contents.

**Independent Test**: Introduce delays in search, appointment persistence, and notification delivery. Verify the stages can be identified separately, cold-start information is included where available, and timing records contain no customer PII.

### Tests for User Story 4

- [X] T019 [P] [US4] Verify that timing measurements distinguish request stages and exclude customer identifiers, names, phone numbers, and message bodies in `functions/src/functions/appointments/create-public-appointment.spec.ts` and `client/src/pages/BookingPage.spec.tsx`

### Implementation for User Story 4

- [X] T020 [US4] Measure client-observed availability search and appointment submission durations at their service boundaries without recording customer contact data in `client/src/services/availability.service.ts` and `client/src/services/appointment.service.ts`
- [X] T021 [US4] Record structured durations for shared-data resolution, conflict reads, slot evaluation, transaction, and notification processing, including a cold-start indicator where available and excluding PII, in `functions/src/services/availability.service.ts`, `functions/src/services/booking.service.ts`, and `functions/src/services/appointment-notification.service.ts`
- [ ] T022 [US4] Document and perform staging measurements with at least 100 search samples and 100 successful booking samples, report p95 against the 3-second targets, and separate cold-start and notification-delivery durations where possible in `specs/005-booking-request-performance/quickstart.md`

**Execution note**: The staging measurement procedure and results table are documented in `quickstart.md`; real staging samples remain pending because no staging environment or test notification destinations were provided.

**Checkpoint**: Operators can attribute latency to search, registration, or notification delivery while preserving customer privacy.

---

## Phase 7: Polish & Cross-Cutting Validation

**Purpose**: Validate the integrated stories against the existing project commands and documented acceptance criteria.

- [X] T023 Run the focused booking tests, Firestore emulator concurrency scenario, both existing package builds, and index verification described in `specs/005-booking-request-performance/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No initialization tasks; use current package dependencies and emulator configuration.
- **Foundational (Phase 2)**: No additional shared blocker; existing application infrastructure is sufficient.
- **User Stories (Phases 3-6)**: Start after the existing infrastructure is available. US1 and US2 can be developed independently except where they share `functions/src/services/availability.service.ts` or `client/src/pages/BookingPage.tsx`.
- **Polish (Phase 7)**: Run after the desired user stories are complete.

### User Story Dependencies

- **US1 (P1)**: Independent; retains the existing single-day operation while adding bounded search.
- **US2 (P1)**: Independent of US1 at the behavior level. T012 must reuse the domain rules implemented in T004; avoid parallel edits to their shared service file.
- **US3 (P2)**: Builds on the error outcomes and UI flows delivered by US1 and US2.
- **US4 (P2)**: Measures the completed search, registration, and notification paths; staging measurement follows their implementation.

### Within Each User Story

- Tests precede implementation for that story.
- Shared types precede the callable and client integration.
- Slot validation precedes transactional booking changes that depend on it.
- Persisting the notification job precedes trigger processing and deployment export.
- Client receipt behavior is validated independently from notification completion and availability refresh.

### Parallel Opportunities

- T001 and T002 can run in parallel; they cover separate Functions and client test files.
- T003 can run in parallel with the US1 tests; it changes only the shared contract file.
- T009 and T010 can run in parallel; they cover separate Functions and client test files.
- After T011, the notification worker work in T014 can proceed separately from the booking transaction changes in T013, provided the job contract is agreed.
- US3 test coverage and US4 test coverage can be prepared independently after their respective story prerequisites; avoid simultaneous edits to shared test files.

---

## Parallel Example: User Story 1

Work on the Functions search scenarios in `functions/src/functions/appointments/search-availability.spec.ts` and the client date-selection scenarios in `client/src/pages/BookingPage.spec.tsx` in parallel. The shared contract can be prepared alongside those tests. Integrate the range service, callable, indexes, client service, and page in dependency order.

---

## Implementation Strategy

### MVP First

1. Complete US1 to deliver one bounded availability search with automatic earliest-date selection.
2. Validate same-day, later-date, and empty-window behavior independently.
3. Complete US2 to return the existing receipt after durable appointment registration without waiting for notifications or availability refresh.

### Incremental Delivery

1. Deliver US1 as the first customer-visible increment.
2. Deliver US2 with selected-slot revalidation, transactional reservations, and deferred notifications.
3. Deliver US3 failure recovery without changing existing error meanings.
4. Deliver US4 stage-level privacy-safe timing and validate its p95 goals in staging.
5. Complete the focused tests, emulator concurrency scenario, builds, and index verification in the final phase.
