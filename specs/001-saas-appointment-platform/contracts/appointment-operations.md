# Authenticated Appointment Operations Contract

## Boundary

Only authenticated users with a current server-verified tenant and role may invoke protected
operations. `tenantId`, role, and professional scope come from trusted identity and persisted
authorization data, not from caller-controlled request fields.

## Operations

### Authenticate with WhatsApp verification

1. The user requests a one-time verification challenge for a phone number.
2. The server starts a challenge through the configured WhatsApp-capable provider.
3. The user submits the received code.
4. The server verifies the code, resolves an active user/business/role, and returns a
   Firebase custom-token sign-in result.

Invalid, expired, replayed, or rate-limited challenges MUST NOT authenticate a user.
Appointment-message consent is separate from authentication verification.

### List appointments

**Input**: Date range, status filters, and optional supported professional/service filters.

**Success**: Appointments in the user's tenant and permitted role/professional scope,
including the customer, service, professional, schedule, lifecycle status, and relevant
historical commercial values.

### Change appointment status

**Input**: Appointment reference and requested transition.

**Success**: The validated transition is persisted and returned with its resulting status.

**Allowed transitions**:

- `pending → confirmed`
- `pending → cancelled`
- `confirmed → completed`

Canceled and completed appointments are terminal. Other administrative corrections require
a separately approved business rule. A status update outside the transition table or caller's
authority is rejected.

### Edit or reschedule appointment

**Input**: Appointment reference and an allowed changed schedule and/or eligible professional.

**Success**: The operation revalidates the current resource, service eligibility, business
timezone, working hours, blocked periods, and conflicts; the appointment and reservations
are updated atomically.

Only pending and confirmed appointments may be rescheduled or reassigned. The request cannot
change the service, customer, tenant, ownership, commercial snapshots, or status. A rejected
change leaves the existing appointment and reservation unchanged. Release reservation keys
when an appointment is cancelled or completed.

## Authorization and Error Outcomes

| Code | Meaning |
|---|---|
| `UNAUTHENTICATED` | No verified active identity |
| `FORBIDDEN` | Role, tenant, professional, or ownership scope does not permit the action |
| `NOT_FOUND` | Resource is absent within the caller's authorized scope |
| `INVALID_TRANSITION` | Requested status transition is not allowed |
| `SLOT_UNAVAILABLE` | Requested edit conflicts with current availability |
| `INVALID_INPUT` | Submitted fields fail domain validation |
| `TEMPORARY_FAILURE` | Retryable server-side failure; no partial success is reported |

Protected operations perform server-side authorization even when the user interface hides
the action. Error responses MUST not disclose whether an inaccessible cross-tenant resource
exists.
