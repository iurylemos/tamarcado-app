# Appointment Creation and Notification Contract

## Appointment Request

The public appointment request input remains unchanged: business, service, professional, selected start time, customer details, and the existing WhatsApp-consent value.

## Success

Return the existing result shape after the appointment and every intersecting reservation have been committed:

```json
{
  "appointmentId": "appointment-id",
  "status": "pending"
}
```

The response does not wait for notification delivery or for the client to refresh availability. The customer receives the existing booking receipt. The client may remove the booked slot immediately and refresh the remaining availability separately.

## Validation and Concurrency

- Validate current business, service, professional eligibility, schedule, interval alignment, blocks, and appointment conflicts on the server at submission time.
- Never treat the client's previously displayed availability as authoritative.
- Commit the appointment and every intersecting reservation atomically. Reject the request if another request already reserved an overlapping interval.
- Preserve existing error meanings for invalid input, inactive/ineligible records, and a no-longer-available slot.

## Deferred Notification

Create one internal notification job in the same transaction as the appointment and reservations. A separate worker sends existing customer/business notifications after persistence.

- Provider delivery is best-effort. A provider-level failure is recorded as failed and does not alter the appointment result.
- Worker execution failures use trigger retries. A completed job is skipped on redelivery.
- Trigger delivery is at-least-once. If an external send succeeds but its completion is not recorded, a duplicate notification is possible.
- The job stores an appointment reference, tenant scope, state, timestamps, and a sanitized failure summary only. It does not duplicate customer contact details or message content.
