# Data Model: Booking Request Performance

## Availability Search Input

Represents one customer search starting on the date currently selected.

| Field | Type | Required | Rules |
|---|---|---:|---|
| `businessSlug` | string | Yes | Identifies the public business |
| `productId` | string | Yes | Identifies a service belonging to that business |
| `date` | business-local `YYYY-MM-DD` | Yes | First date in the search window |

The search window is the requested date and the next 30 calendar dates. Its maximum is enforced by the service, not by a caller-provided range.

## Availability Search Result

| Field | Type | Meaning |
|---|---|---|
| `date` | business-local `YYYY-MM-DD` or `null` | Earliest date with available times; `null` when the entire window is empty |
| `slots` | list of available slots | Slots for `date`, ordered by start time; empty when `date` is `null` |

Each slot retains the existing public fields: `startsAt`, `endsAt`, `professionalId`, and `professionalName`. Date boundaries are evaluated in the business timezone. Search data is advisory and is not a reservation.

## Appointment Notification Job

Represents deferred delivery of notifications for one successfully registered appointment request. Create it atomically with the appointment and its reservations.

| Field | Type | Required | Rules |
|---|---|---:|---|
| `appointmentId` | string | Yes | References the appointment; one job per public appointment request |
| `tenantId` | string | Yes | Business scope for the related appointment |
| `status` | `pending`, `completed`, or `failed` | Yes | Delivery processing state |
| `createdAt` | timestamp | Yes | Job creation time |
| `updatedAt` | timestamp | Yes | Last state update |
| `failureCode` | sanitized string or absent | No | Non-PII summary for an unsuccessful provider delivery |

### State transitions

- `pending` → `completed` after notification processing finishes successfully or the applicable notification is intentionally skipped.
- `pending` → `failed` when a provider-level send fails; provider failures remain best-effort and are not automatically retried.
- An unhandled worker execution failure remains eligible for the configured trigger retry. Completed jobs are skipped on redelivery.
- An external send can succeed before its completion state is persisted; at-least-once trigger delivery means a duplicate notification is possible in that failure window.

The job stores no phone number, customer name, or message body. The worker loads the appointment and uses existing notification rules.

## Existing Appointment and Reservation

The appointment and reservation data models do not change. The appointment remains `pending` after public submission. The current transaction continues to create the appointment and all intersecting five-minute reservation buckets atomically. If any reservation already exists, the request is rejected and no second overlapping appointment is created.
