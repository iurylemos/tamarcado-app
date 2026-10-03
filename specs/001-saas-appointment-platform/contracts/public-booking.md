# Public Catalog and Booking Contract

## Boundary

The public client may discover published business/service information and request a booking.
It does not receive collaborator, backoffice, customer-history, commission, or private
availability administration data. Booking authority remains server-side.

## Operations

### Discover businesses

**Input**: Optional supported discovery filters and a pagination cursor.

**Success**: A paginated list of published public business summaries with stable public IDs
and links to their storefronts.

**Rules**:

- Return only fields from the public business projection.
- Never return private phone, staff, customer, appointment, or financial information.
- Inactive businesses are not discoverable or bookable.

### Read business catalog

**Input**: Business slug/public identifier.

**Success**: The business's published storefront details and active public services, including
service description, image, price, and duration required by the booking flow.

**Rules**:

- Resolve only the matching active business.
- Return active public services belonging to that same business.
- Do not expose commission terms or staff-only notes.
- Public page HTML includes meaningful business/service content and route-specific metadata.

### List available times

**Input**: Business public identifier, service ID, date range, and optional professional ID.

**Success**: Available start/end instants with the eligible professional needed to reserve
each time.

**Rules**:

- The service must be active and belong to the business.
- The professional must be active and associated with the service.
- A professional is selected automatically when only one eligible professional can serve
  the chosen time; otherwise the customer may select among eligible professionals.
- Availability accounts for business timezone, service duration, business booking interval,
  working hours, blocked periods, and active appointments/reservations.
- Results are advisory only; they do not reserve time. Booking revalidates every condition.

### Create appointment request

**Input**:

| Field | Required | Meaning |
|---|---:|---|
| `businessId` | Yes | Public business identifier |
| `serviceId` | Yes | Active service |
| `professionalId` | Yes after eligibility resolution | Eligible service provider |
| `startsAt` | Yes | Selected UTC instant |
| `customerName` | No | Customer display name |
| `customerPhone` | Yes | Brazilian phone with DDD, normalized before persistence |
| `whatsappOptIn` | Yes | Explicit, business-specific choice for appointment messages |

**Success**: An appointment in `pending` state with a public-safe request reference. A
WhatsApp confirmation message is queued only when valid opt-in exists and provider rules
permit sending. The user receives visible confirmation of the request independent of message
delivery.

**Rules**:

- Do not accept `tenantId`, role, price, commission, duration, status, or calculated amounts
  from the public request as authoritative values.
- Resolve the tenant from the public business identifier and derive all commercial values
  from the current service record.
- Validate input, active business/service/professional, same-tenant relationships, service
  assignment, working hours, blocked periods, business-local start interval, and conflicts.
- Atomically write the appointment and every intersecting booking reservation.
- If another request claimed an overlapping reservation, return `SLOT_UNAVAILABLE` and do
  not create a second active appointment.
- A messaging outage does not roll back the appointment and does not change it from pending.

## Error Outcomes

| Code | Meaning |
|---|---|
| `INVALID_INPUT` | Missing, malformed, or invalid customer/service/time data |
| `NOT_FOUND` | Business or service does not exist or is not public |
| `NOT_BOOKABLE` | Business, service, or professional is inactive or ineligible |
| `SLOT_UNAVAILABLE` | Time is no longer available or conflicts with another reservation |
| `RATE_LIMITED` | Public request limit exceeded |
| `TEMPORARY_FAILURE` | A retryable service failure; no partial appointment is reported |

Errors MUST be actionable and MUST NOT reveal another tenant's data or internal provider
details.
