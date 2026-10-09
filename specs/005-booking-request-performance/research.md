# Research: Booking Request Performance

## Current Request Path

- The client first requests availability for one date, then searches up to 30 later dates with sequential callable requests when the selected date is empty. See `../../client/src/pages/BookingPage.tsx`.
- Each availability invocation re-resolves the public business and service, loads professional assignments and records, reads all blocked periods for the tenant, and queries working hours, appointments, and reservations. See `../../functions/src/services/availability.service.ts`.
- Appointment creation calls the full-day availability function again before committing the appointment and reservations. After the transaction it reads the appointment back and awaits notification delivery. See `../../functions/src/services/booking.service.ts`.
- The client waits for the post-booking availability refetch before leaving its submission-pending state. See `../../client/src/pages/BookingPage.tsx`.
- No production p50/p95 baseline or stage-timing instrumentation was found in the inspected request paths. Production measurements are required to establish actual latency and cold-start contribution.

## Decisions

### Bounded Availability Search

- **Decision**: Add an availability-search operation that evaluates the selected business-local date and at most the next 30 dates, returning the earliest date with slots or an empty-window outcome. Keep the existing single-day availability contract unchanged.
- **Rationale**: This removes the serial client/server round trips while preserving compatibility for existing callers and the current automatic date advancement.
- **Alternatives considered**:
  - Run daily requests in parallel: shorter than serial calls in some cases, but still creates up to 31 client requests and repeated server reads.
  - Replace the existing single-day contract: fewer interfaces, but risks breaking callers and tests unnecessarily.

### Firestore Reads Across Dates

- **Decision**: Resolve common business/service/professional data once. Query each assigned professional's working hours for relevant weekdays once, and query appointments and reservations over the full bounded range rather than once per date. Query blocked periods by overlap with the range. Convert date-window boundaries using the business timezone.
- **Rationale**: The configured working-hours records are weekday-based, while bookings and reservations are timestamp-based. Shared reads and range queries avoid repeating the same database work for every candidate date.
- **Index and query constraints**:
  - Firestore supports `in` queries and up to 30 disjunctions after conversion to disjunctive normal form. A seven-day weekday filter is within that limit; avoid combining it with a second large `in` set that multiplies disjunctions.
  - Firestore supports range filters on multiple fields, with up to 10 range/inequality fields. Queries combining tenant/professional equality filters with date or overlap filters may require composite indexes; add and verify indexes for the exact production queries.
  - The query must include intervals that overlap the search window, including any appointment or block that starts before the window but ends inside it. All date boundaries are business-local before conversion to UTC.
- **Alternatives considered**:
  - Query each date independently: simpler, but repeats reads and does not solve the underlying fan-out.
  - Load all tenant appointment and blocked-period records: avoids date-query complexity but has unbounded reads and is not suitable as the business grows.
- **Sources**:
  - [Firestore `in` and query operators](https://firebase.google.com/docs/firestore/query-data/queries#in_not-in_array-contains-any)
  - [Multiple range fields](https://firebase.google.com/docs/firestore/query-data/multiple-range-fields)
  - [Firestore index overview](https://firebase.google.com/docs/firestore/query-data/index-overview)

### Focused Appointment Validation

- **Decision**: Reuse the availability domain rules to validate the requested start time only, checking business/service/professional eligibility, working hours, interval alignment, current conflicts, and blocks. Keep the transaction that creates the appointment and every intersecting reservation as the final concurrency guard.
- **Rationale**: Booking a single selected time does not require generating all candidate slots for the day. Server-side revalidation and atomic reservations preserve integrity even when availability changes after the search.
- **Alternatives considered**:
  - Keep calling full-day slot listing during creation: preserves behavior but repeats unnecessary slot generation and broad availability work.
  - Trust the client availability response: lower server work but would allow stale or forged availability to authorize a booking; rejected by the constitution.

### Notification Outbox and Trigger

- **Decision**: Create a durable notification job in the same Firestore transaction as the appointment and reservations. A separate Firestore-triggered worker handles customer/business notifications. Record pending, completed, or failed status. Provider-level failures are recorded without provider retry, preserving current best-effort behavior; processor execution errors use the configured trigger retry mechanism. Completed jobs are skipped on redelivery.
- **Rationale**: Firestore transactions can atomically persist the appointment and job, while external notification work no longer extends the booking callable response. Firestore-triggered delivery is at-least-once, not exactly-once.
- **Risk and limitation**: If a provider accepts a message and the worker fails before recording completion, a redelivery can duplicate the message. The external send cannot be made atomic with the Firestore transaction; use provider idempotency only if the existing provider contract supports it. Notification delivery latency is not a guarantee of the booking response.
- **Alternatives considered**:
  - Await notification delivery in the callable: existing behavior, but external provider latency delays confirmation.
  - Fire-and-forget a provider call from the callable: fast in the happy path but not durable across function termination and does not provide recoverable processing.
- **Sources**:
  - [Firestore event trigger limitations](https://firebase.google.com/docs/functions/firestore-events#limitations)
  - [Cloud Functions retry semantics](https://firebase.google.com/docs/functions/retries#semantics_of_retry)
  - [Idempotency guidance for retryable event-driven functions](https://firebase.google.com/docs/functions/retries#make_retryable_event-driven_functions_idempotent)
  - [Firestore transactions](https://firebase.google.com/docs/firestore/manage-data/transactions)
  - [Callable function responses](https://firebase.google.com/docs/functions/callable#send_back_the_result)

### Post-Booking Refresh and Timing

- **Decision**: Show the existing success receipt after appointment persistence, remove the booked slot from the current result, and perform remaining-availability refresh without keeping form submission pending. Record stage durations and a cold-start indicator where available, with no customer phone/name or message content.
- **Rationale**: The refresh and notifications are follow-up work, not prerequisites for acknowledging a committed appointment. Timing data distinguishes server-side work from external delivery and customer-visible request duration.
- **Alternatives considered**:
  - Await the refresh before resolving submission: unnecessary for the success receipt and currently extends the pending state.
  - Log full request payloads for diagnosis: exposes personal data without being needed to measure latency; rejected.

## Open Questions

None for the approved scope. The 3-second p95 targets are treated as acceptance goals under ordinary network/service conditions; cold-start and outlier effects are measured separately.
