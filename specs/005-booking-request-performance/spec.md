# Feature Specification: Booking Request Performance

**Feature Branch**: Not created; Spec Kit feature identifier is `005-booking-request-performance`

**Created**: 2026-10-08

**Status**: Approved for Planning

**Input**: Improve the performance of public appointment availability searches and appointment requests. Preserve automatic advancement to the next date with available times and the current booking experience. Focus on slow requests rather than redesigning the frontend.

## User Scenarios & Testing

### User Story 1 - Find the next available time (Priority: P1)

As a customer choosing an appointment date, I want to see available times for that date or be moved to the next date with availability, so that I can continue booking without waiting through repeated searches.

**Why this priority**: Availability is the first essential decision in the booking flow, and the current search delay prevents customers from knowing when they can book.

**Independent Test**: Choose dates with availability on the same day, on a later day within the search window, and nowhere in the window. Verify the first available date and its times are shown, or a clear no-availability result is shown.

**Acceptance Scenarios**:

1. **Given** the selected date has available times, **When** the customer searches, **Then** those times appear and the selected date remains unchanged.
2. **Given** the selected date has no available times but a later date does, **When** the customer searches, **Then** the selected date advances automatically to the earliest date with available times.
3. **Given** no date in the search window has available times, **When** the search completes, **Then** the customer receives a clear no-availability result and can choose another date.
4. **Given** the customer selects a different date while viewing availability, **When** the new search completes, **Then** the result corresponds to the newly selected date or its earliest available alternative.

---

### User Story 2 - Submit an appointment request promptly (Priority: P1)

As a customer who selected an available time, I want to receive confirmation that my appointment request was registered without waiting for unrelated notification delivery or an availability refresh, so that I know my request was received promptly.

**Why this priority**: Delayed confirmation makes customers uncertain whether the appointment request succeeded and can lead them to repeat the submission.

**Independent Test**: Submit a valid request while notification delivery and the post-booking availability refresh are delayed. Verify the request is acknowledged after it is safely registered and the existing receipt is shown without waiting for those operations.

**Acceptance Scenarios**:

1. **Given** the selected time is still available, **When** the customer submits valid details, **Then** the appointment request is registered and the existing receipt appears without waiting for notification delivery.
2. **Given** notification delivery is delayed or fails, **When** the appointment request is registered, **Then** the request remains successful and its notification outcome is handled separately.
3. **Given** another customer reserves the same time first, **When** the customer submits the request, **Then** the request is rejected as unavailable and no duplicate appointment is created.
4. **Given** the request succeeds, **When** remaining availability is refreshed, **Then** the refresh does not extend the pending state or delay the receipt.

---

### User Story 3 - Recover from request failures (Priority: P2)

As a customer whose availability or appointment request cannot be completed, I want an actionable result, so that I can retry or choose another date without uncertainty.

**Why this priority**: Faster requests must still distinguish a genuine failure from an empty schedule or a successful appointment request.

**Independent Test**: Simulate unavailable network/service responses, invalid dates, and a time taken by another customer. Verify each result is distinguishable and the customer can continue safely.

**Acceptance Scenarios**:

1. **Given** availability cannot be retrieved, **When** the search fails, **Then** the existing actionable error is shown and no stale times are presented as current results.
2. **Given** an appointment request cannot be registered, **When** submission fails, **Then** the customer receives an actionable error and no success receipt is shown.
3. **Given** the selected time is no longer available, **When** the customer submits, **Then** the customer is asked to choose another available time.

---

### User Story 4 - Identify slow booking requests (Priority: P2)

As an operator, I want to distinguish delays in availability searches, appointment registration, and notification delivery without exposing customer personal data, so that performance problems can be diagnosed and addressed.

**Why this priority**: The observed delays need to be attributed to the work that is slow, rather than guessed from the customer-facing loading state.

**Independent Test**: Introduce delays in availability retrieval, appointment registration, and notification delivery. Verify that each operation's duration can be distinguished without logging customer contact details or message content.

**Acceptance Scenarios**:

1. **Given** an availability search completes, **When** its performance is reviewed, **Then** its duration can be distinguished from appointment registration.
2. **Given** an appointment is registered and notifications are sent separately, **When** their performance is reviewed, **Then** the registration and notification durations can be distinguished.

## Edge Cases

- The selected date has no availability and the first available date is the last date in the supported search window.
- There are no available times anywhere in the supported search window.
- The requested date is invalid or outside the business's supported booking rules.
- Availability changes between the search result and appointment submission.
- Two customers submit overlapping requests at nearly the same time.
- Notification delivery is delayed or fails after the appointment request is registered.
- The post-booking availability refresh is slower than appointment creation or fails.

## Requirements

### Functional Requirements

- **FR-001**: The customer MUST be able to search availability starting from the selected business-local date.
- **FR-002**: When the selected date has no available times, the system MUST automatically select the earliest date with available times within the selected date and the following 30 calendar days.
- **FR-003**: The system MUST return a clear no-availability outcome when no times are available within that search window.
- **FR-004**: A single customer search MUST NOT require a separate customer-visible wait for each candidate date.
- **FR-005**: The system MUST verify that the selected time is valid and available when the customer submits an appointment request.
- **FR-006**: The system MUST prevent overlapping appointment requests for the same professional and time from both being accepted.
- **FR-007**: Once an appointment request is registered, the customer MUST receive the existing success receipt without waiting for notification delivery or remaining-availability refresh.
- **FR-008**: A notification delivery failure MUST NOT undo or change the status of a registered appointment request.
- **FR-009**: Availability and booking failures MUST remain distinguishable from successful results and empty availability.
- **FR-010**: The system MUST measure request durations in a way that allows slow availability searches and appointment submissions to be identified without recording unnecessary customer personal data.
- **FR-011**: The booking page MUST retain its current visual design, booking steps, and receipt behavior.

### Key Entities

- **Availability result**: The available appointment times for a date, or the earliest later date with available times within the search window.
- **Appointment request**: A customer's request for a selected service, professional, and time, which remains pending until handled through the existing business workflow.
- **Notification outcome**: The separate outcome of sending the existing customer or business notification after an appointment request is registered.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A search spanning the selected date and the following 30 days uses one customer-visible search operation and returns the earliest available date or a no-availability result.
- **SC-002**: Under ordinary network and service conditions, at least 95% of availability searches show available times or a no-availability result within 3 seconds.
- **SC-003**: Under ordinary network and service conditions, at least 95% of successful appointment submissions show the existing receipt within 3 seconds.
- **SC-004**: No pair of concurrent overlapping requests for the same professional is accepted.
- **SC-005**: Delaying or failing notification delivery does not delay or reverse the successful appointment-request receipt.
- **SC-006**: The booking interface's existing primary flow and visual presentation remain unchanged.
- **SC-007**: Operators can distinguish availability-search, appointment-registration, and notification delays without access to customer phone numbers or message contents.

## Assumptions

- The automatic search window includes the selected date and the 30 calendar days immediately after it.
- The first date with available times is selected automatically; customers retain the ability to choose a different date.
- A successful customer confirmation means the appointment request has been registered and remains pending for the existing business workflow.
- Notification delivery remains best-effort and separate from appointment registration.
- The 3-second p95 targets apply under ordinary network and service conditions; cold-start and other outlier effects will be measured separately.
- Existing booking rules, time-zone handling, and appointment status transitions remain authoritative.
