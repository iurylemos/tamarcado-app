# Implementation Plan: Booking Request Performance

**Branch**: Not created; Spec Kit feature `005-booking-request-performance` | **Date**: 2026-10-08 | **Spec**: [spec.md](./spec.md)

**Input**: Approved feature specification in `specs/005-booking-request-performance/spec.md`

## Summary

Replace serial per-day public availability calls with one bounded search request that returns the earliest available date and slots. Reduce appointment creation latency by validating the requested slot directly, retaining transactional reservation writes, and moving notifications and the post-booking availability refresh off the request's critical path. Preserve current booking behavior and gather stage-level latency measurements.

## Technical Context

**Language/Version**: TypeScript; Firebase Functions runtime Node.js 24

**Primary Dependencies**: `firebase-functions` 7.4, `firebase-admin` 14.5, Firebase Web SDK 12.19, React 19.3, TanStack Query 5.104, Twilio 5.10

**Storage**: Cloud Firestore; appointment reservations are written transactionally

**Testing**: Vitest in `client` and `functions`; Firestore emulator integration tests; existing TypeScript builds in both packages

**Target Platform**: Public React/Vite client and Firebase Functions v2 in `southamerica-east1`

**Project Type**: Full-stack public appointment-booking flow

**Performance Goals**: One client-visible availability search covers the selected date and up to 30 following dates. At least 95% of availability searches and successful appointment submissions complete within 3 seconds under ordinary network/service conditions. Appointment response does not wait for notification delivery.

**Constraints**: Preserve business-local date and timezone semantics, full server-side eligibility checks, atomic reservation guarantees, existing error behavior and booking UI. Do not log unnecessary personal data. Preserve the existing single-day availability callable contract. Firestore range queries need verified composite indexes. Firestore trigger delivery is at-least-once; external WhatsApp delivery cannot be atomic with appointment persistence.

**Scale/Scope**: One public booking flow, a maximum 31-date availability window, and the existing public client, shared domain, Functions, Firestore indexes, and focused tests.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Domain and User Flow Integrity — PASS**: The change retains business-scoped booking and the existing customer path; automatic advancement only chooses the earliest date with availability.
- **II. Booking and Availability Integrity — PASS WITH DESIGN CONSTRAINT**: Direct slot validation must include all current business rules. Transactional reservation writes remain the final guard against concurrent bookings; timezone behavior is unchanged.
- **III. Security and Authorization — PASS WITH DESIGN CONSTRAINT**: Server-side input, tenant, product, and professional validation remains authoritative. Timing logs must exclude customer PII and message content.
- **V. Testability and Quality — PASS**: Add tests for range bounds, slot validation, notifications independent of the booking response, and concurrency; retain both package build/type checks.
- **VI. Separation of Application Boundaries — PASS**: Client request orchestration, shared domain rules, Firestore persistence, and WhatsApp delivery stay in their existing application/service boundaries.
- **VII. User Experience and Accessibility — PASS**: Keep existing page presentation, automatic date advancement, receipt, actionable errors, and loading/accessibility behavior.
- **VIII. Maintainability and Simplicity — PASS WITH DESIGN CONSTRAINT**: Reuse the existing availability rules where practical. Add a durable notification job only to remove external delivery from the booking critical path; avoid introducing a generic queue abstraction.

**Initial gate result**: PASS. The design constraints above are mandatory.

## Phase 0: Research Decisions

Research is complete in [research.md](./research.md); no unresolved technical-context questions remain.

- Use an additive bounded availability-search contract instead of changing the existing single-day callable.
- Reuse shared business/service/professional resolution and query time-dependent conflicts across the business-local date window. Add and verify indexes for the final range/overlap queries.
- Validate only the chosen slot during create; retain current server-side rules and atomically write the appointment and all reservation buckets.
- Persist notification work in the same transaction, process it from a separate Firestore trigger, and acknowledge appointment creation after persistence. Provider delivery remains best-effort; event processing is at-least-once.
- Return the existing receipt without awaiting either notification delivery or remaining-availability refresh. Measure each stage without customer PII.

## Technical Design

### Availability

Add a public `searchAvailability` callable with the selected start date. Its maximum window is fixed server-side to the selected date plus 30 calendar days. Resolve the business, service, eligible professionals, and assignments once; load each professional's weekly hours once; query appointments, reservations, and blocks for the full overlap-aware window. Evaluate dates chronologically and stop on the first date with slots. Convert local day boundaries using the business timezone, including DST transitions. Return `{ date: string | null, slots: AvailableSlot[] }`.

The client calls this operation for the selected date. If the response date differs, update the date and reuse the returned slots rather than immediately making a second availability request. A user-selected date starts a new bounded search. Keep `listAvailability` and its existing response contract available. Add Firestore indexes for the exact multi-filter range queries and validate them with emulator tests and deployment configuration.

### Appointment creation

Extract/reuse the current schedule and conflict rules in a focused selected-slot validator. Use the business, service, professional, and association already resolved by the create request rather than repeating those lookups through `listAvailableSlots`. Validate date, working hours, booking interval, blocked periods, and current appointments. Keep the transactional reservation reads and appointment/reservation creates as the final concurrency guard.

Create a notification job in the same transaction. A Firestore-created event worker loads the appointment and performs the existing customer/business notification actions. Record job outcome without copying customer contact data. Provider-level failure is recorded as failed and does not automatically retry; unhandled worker execution errors use event retries. Skip completed jobs. Document the unavoidable at-least-once duplicate-send window in operational logs and tests.

After the transaction commits, return the existing appointment result without a read-after-write or provider round trip. The client presents the existing receipt, removes the selected slot locally, and schedules availability invalidation/refetch without blocking submission completion.

### Observability

Add structured duration measurements at client-visible callable boundaries and server stages: common-data resolution, conflict reads, slot evaluation, transaction, and notification worker. Include a cold-start indicator where available. Do not include customer identifiers, phone numbers, names, or message bodies. Compare at least 100 staging samples for each operation; report cold-start and warm samples separately where possible.

## Project Structure

### Documentation (this feature)

```text
specs/005-booking-request-performance/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/
│   ├── availability-search.md
│   └── appointment-creation.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)
```text
client/src/pages/BookingPage.tsx
client/src/services/availability.service.ts
client/src/services/appointment.service.ts
client/src/services/query-client.ts
functions/src/functions/appointments/
functions/src/services/availability.service.ts
functions/src/services/booking.service.ts
functions/src/services/appointment-notification.service.ts
functions/src/model/
shared/domain/interfaces/availability.interface.ts
firestore.indexes.json
client/src/pages/BookingPage.spec.tsx
functions/src/functions/appointments/create-public-appointment.spec.ts
specs/005-booking-request-performance/
├── contracts/
├── research.md
├── data-model.md
└── quickstart.md
```

**Structure Decision**: Extend the existing public client, shared availability contracts, and Functions booking/availability services. Keep the existing single-day callable for compatibility and add a bounded search contract. Add notification-job persistence/processing alongside the current appointment service, with the deployment entry point under `functions/src/functions/appointments/`. Store feature design artifacts in the active Spec Kit directory.

## Constitution Check (Post-Design)

- **I. Domain and User Flow Integrity — PASS**: The additive search retains the existing business-scoped booking path and automatic first-available-date selection.
- **II. Booking and Availability Integrity — PASS**: Focused validation retains every business rule; the transaction and reservation documents remain the final concurrency guard. The public request remains pending after creation.
- **III. Security and Authorization — PASS**: Tenant/business relationships and public input are validated server-side. The internal notification job contains references/status only, and timing logs exclude PII.
- **V. Testability and Quality — PASS**: The quickstart and contracts require range, error, notification, and concurrency coverage plus existing package builds.
- **VI. Separation of Application Boundaries — PASS**: UI state stays in the client; availability/booking rules stay in services; Firestore outbox dispatch remains a backend concern.
- **VII. User Experience and Accessibility — PASS**: Existing layout, loading feedback, date advancement, receipt, and error presentation remain unchanged.
- **VIII. Maintainability and Simplicity — PASS**: The design adds one bounded search contract and one narrow notification job flow; no generic queue or UI rewrite is introduced.

**Post-design gate result**: PASS. Firestore indexes must be deployed before the new indexed queries are enabled. Notification event delivery remains at-least-once, with the duplicate-send limitation documented in [research.md](./research.md).

## Complexity Tracking

No constitution violations. The targeted notification job is justified by the requirement that external delivery must not delay appointment registration; it is not a general-purpose queue.
