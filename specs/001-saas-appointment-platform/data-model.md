# Data Model: SaaS Appointment Commerce Platform

This model is a logical Firestore design for the feature. All collections are root-level;
Firestore subcollections are not used. Unless identified as a public projection, every
document belongs to one business and carries `tenantId`.

## Conventions

- Document IDs are stable opaque identifiers. IDs used for reservations and projections are
  deterministic where uniqueness or idempotent rebuilds require it.
- `tenantId` is set or verified by trusted operations; clients cannot select a tenant by
  submitting an arbitrary value.
- Phone values are normalized to E.164 for matching and stored as sensitive data. Brazilian
  presentation uses the country code and DDD.
- Appointment instants are UTC timestamps. Weekly operating hours use local wall-clock values
  interpreted in the business's IANA timezone.
- BRL values are integer cents. Percentage commission values are integer basis points
  (10,000 basis points = 100%); calculations round half-up to the nearest cent.
- Public projections contain only explicitly approved storefront fields and are maintained
  from the private source records.

## Entities and Collections

### `tenants`

Represents a SaaS business.

| Field | Type | Rules |
|---|---|---|
| `id` | string | Document identifier |
| `name` | string | Required, customer-facing business name |
| `slug` | string | Required, unique public identifier |
| `phoneE164` | string | Optional, sensitive |
| `logoUrl` | string | Optional public asset reference |
| `timezone` | IANA timezone string | Required; default `America/Sao_Paulo` |
| `bookingIntervalMinutes` | integer | Required, multiple of 5; default 15 |
| `active` | boolean | Required; inactive businesses cannot accept bookings |
| `createdAt`, `updatedAt` | timestamp | Required |

### `users`

Represents an authenticated collaborator or backoffice user. The associated tenant and role
are repeated in trusted Firebase Auth claims and checked against this record by trusted
operations.

| Field | Type | Rules |
|---|---|---|
| `id` | string | Firebase Auth UID |
| `tenantId` | string | Required |
| `role` | enum | `collaborator` or `backoffice` |
| `professionalId` | string | Optional; required for a professional-scoped collaborator |
| `name` | string | Required |
| `phoneE164` | string | Required, verified, sensitive |
| `photoUrl` | string | Optional |
| `active` | boolean | Required; inactive users cannot access protected operations |
| `createdAt`, `updatedAt` | timestamp | Required |

### `products`

Represents a bookable service and its current commercial configuration.

| Field | Type | Rules |
|---|---|---|
| `id`, `tenantId` | string | Required; one owning business |
| `name` | string | Required |
| `description` | string | Optional |
| `imageUrl` | string | Required public image reference |
| `priceCents` | integer | Non-negative BRL amount |
| `durationMinutes` | integer | Positive; used to calculate occupied time |
| `commissionType` | enum | `percentage` or `fixed` |
| `commissionValue` | integer | Basis points for percentage, cents for fixed |
| `active` | boolean | Required |
| `createdAt`, `updatedAt` | timestamp | Required |

Commission values must be non-negative; percentage values cannot exceed 10,000 basis points.
Only active products can be booked.

### `professionals`

Represents a service provider within one business.

| Field | Type | Rules |
|---|---|---|
| `id`, `tenantId` | string | Required |
| `name` | string | Required |
| `phoneE164` | string | Required, sensitive |
| `photoUrl` | string | Optional |
| `active` | boolean | Required |
| `createdAt`, `updatedAt` | timestamp | Required |

### `professional_products`

Many-to-many assignment of professionals to services.

| Field | Type | Rules |
|---|---|---|
| `id` | string | Deterministic from tenant, professional, and product |
| `tenantId` | string | Required |
| `professionalId` | string | Must reference a professional in the same tenant |
| `productId` | string | Must reference a product in the same tenant |
| `active` | boolean | Required |

The pair `(tenantId, professionalId, productId)` is unique. Both referenced entities must
be active for the professional to be eligible.

### `working_hours`

Weekly repeating availability for a professional.

| Field | Type | Rules |
|---|---|---|
| `id`, `tenantId` | string | Required |
| `professionalId` | string | Must reference a professional in the same tenant |
| `dayOfWeek` | integer | 1-7, Monday-Sunday in the business timezone |
| `startLocalTime`, `endLocalTime` | string | Local `HH:mm`, start must precede end |
| `active` | boolean | Required |

Overlapping active intervals for one professional and weekday are invalid.

### `blocked_periods`

One-time periods unavailable for booking.

| Field | Type | Rules |
|---|---|---|
| `id`, `tenantId` | string | Required |
| `professionalId` | string | Optional for business-wide blocks |
| `startsAt`, `endsAt` | timestamp | UTC instants; `startsAt < endsAt` |
| `reason` | string | Optional, private operational information |
| `createdBy` | string | Authorized user UID |
| `createdAt` | timestamp | Required |

The availability check treats blocks as half-open intervals `[startsAt, endsAt)` and rejects
any overlapping booking.

### `appointments`

Transactional source of truth for requests, delivered services, sales, and commissions.

| Field | Type | Rules |
|---|---|---|
| `id`, `tenantId` | string | Required |
| `customerPhoneE164` | string | Required, sensitive |
| `customerName` | string | Optional |
| `productId` | string | Must reference a product in the same tenant |
| `professionalId` | string | Required after eligibility resolution |
| `scheduledAt`, `endsAt` | timestamp | UTC instants; half-open occupied interval |
| `durationMinutes` | integer | Snapshotted at request creation |
| `status` | enum | `pending`, `confirmed`, `cancelled`, `completed` |
| `productNameSnapshot` | string | Required historical display value |
| `productPriceCentsSnapshot` | integer | Required non-negative BRL amount |
| `commissionTypeSnapshot` | enum | `percentage` or `fixed` |
| `commissionValueSnapshot` | integer | Basis points or cents, matching the type |
| `commissionAmountCentsSnapshot` | integer | Required calculated amount |
| `createdAt`, `updatedAt` | timestamp | Required |
| `createdBy` | string | Customer booking or authorized user identity |
| `updatedBy` | string | Optional actor UID for auditability |

The service, professional, tenant, and appointment must have consistent ownership.
The customer phone, service, professional, duration, and commercial snapshots are immutable
after booking creation in this release. Appointment edits change the schedule only. To change
the service or commercial terms, staff must cancel the original request and create a new one;
completed transactions are never rewritten.

### `booking_reservations`

Deterministic conflict keys for occupied professional time.

| Field | Type | Rules |
|---|---|---|
| `id` | string | Deterministic from tenant, professional, and UTC 5-minute bucket |
| `tenantId` | string | Required |
| `professionalId` | string | Required |
| `appointmentId` | string | Required |
| `bucketStartAt` | timestamp | UTC start of the reserved 5-minute interval |
| `createdAt` | timestamp | Required |

The tenant's customer-facing booking interval is configurable in multiples of five minutes
(15-minute default); the internal five-minute reservation quantum remains stable if the
business changes its offered start interval. A booking reserves every quantum intersecting
its half-open service interval. Keys are created, moved, or released in the same transaction
as the appointment mutation.

### `connections`

Business-owned messaging sender or provider connection metadata. Secrets MUST be held in a
managed secret store, not in Firestore documents or frontend configuration.

| Field | Type | Rules |
|---|---|---|
| `id`, `tenantId` | string | Required |
| `provider` | string | Required integration identifier |
| `providerAccountRef` | string | Optional non-secret provider reference |
| `status` | enum | `active` or `inactive` |
| `createdAt`, `updatedAt` | timestamp | Required |

### `contacts`

Business-scoped customer contact and messaging preference.

| Field | Type | Rules |
|---|---|---|
| `id`, `tenantId` | string | Required |
| `connectionId` | string | Optional; if present, must reference a connection in the same tenant |
| `phoneE164` | string | Required, sensitive; unique per tenant |
| `name` | string | Optional |
| `whatsappOptIn` | boolean | Required; defaults to false |
| `optInAt`, `optOutAt` | timestamp | Required when the corresponding consent change occurs |
| `consentSource` | string | Required when opted in; identifies the capture context |
| `createdAt`, `updatedAt` | timestamp | Required |

Authentication OTP verification does not set `whatsappOptIn`. An opt-out immediately blocks
non-essential appointment messages.

### `messages`

Business-scoped message history and delivery state.

| Field | Type | Rules |
|---|---|---|
| `id`, `tenantId` | string | Required |
| `connectionId`, `contactId` | string | Same-tenant references |
| `appointmentId` | string | Optional same-tenant reference |
| `direction` | enum | `inbound` or `outbound` |
| `content` | string | Sensitive; access restricted and retention reviewed |
| `templateCategory` | string | Optional provider-approved category |
| `status` | enum | `pending`, `sent`, `delivered`, `read`, `failed` |
| `providerMessageId` | string | Optional, unique when provided |
| `failureCode` | string | Optional sanitized provider/domain code |
| `createdAt`, `updatedAt` | timestamp | Required |

Provider callbacks update message state idempotently. Message state never changes appointment
status.

### `public_businesses` and `public_products`

Public projections for customer discovery and crawlable pages.

- `public_businesses`: public business name, slug, approved description, logo, and approved
  discovery attributes.
- `public_products`: tenant/public business identifier, product identifier, name,
  description, image, public price, duration if needed for booking, and active/published
  state.

These documents MUST NOT contain customer data, professional phone numbers, commission
configuration, staff-only notes, credentials, or private business reports. Updates are
derived from authorized source changes.

### `monthly_reports`

Rebuildable read model for monthly summaries, partitioned by tenant, period, and optional
dimension; never the financial source of truth. Use one document per aggregate dimension
rather than an unbounded map in one document.

| Field | Type | Rules |
|---|---|---|
| `id` | string | Deterministic by tenant, local reporting month, dimension type, and dimension ID |
| `tenantId` | string | Required |
| `year`, `month` | integer | Business-local month |
| `timezone` | string | Business timezone used for period boundaries |
| `dimensionType` | enum | `tenant`, `professional`, or `product` |
| `dimensionId` | string | Tenant ID or same-tenant professional/product ID |
| `totalSalesCents` | integer | Completed appointment totals only |
| `totalCommissionCents` | integer | Snapshotted commission totals |
| `generatedAt`, `updatedAt` | timestamp | Required |

Every report must be reproducible from eligible appointments. Report filters and CSV exports
use the same eligibility and timezone logic as the rendered report.

## Relationships

- A tenant owns products, professionals, users, availability, appointments, connections,
  contacts, messages, public projections, and report records.
- A professional can provide multiple products through `professional_products`; a product
  can be provided by multiple professionals.
- An appointment belongs to one tenant, one product, one professional, and one customer
  phone. It may refer to a related contact/message.
- A booking reservation belongs to one appointment and one professional time quantum.
- Reports aggregate appointments by tenant, business-local period, product, and professional.

## Appointment State Transitions

| Current state | Allowed next state | Actor / condition |
|---|---|---|
| `pending` | `confirmed` | Authorized collaborator/backoffice in tenant scope |
| `pending` | `cancelled` | Authorized collaborator/backoffice in tenant scope |
| `confirmed` | `completed` | Authorized collaborator/backoffice after service delivery |
| `confirmed` | `cancelled` | Authorized collaborator/backoffice in tenant scope |
| `cancelled` | none | Terminal |
| `completed` | none | Terminal; corrections require an auditable adjustment process |

Rescheduling is limited to pending or confirmed appointments, preserves the current state,
and is permitted only after current availability and all new reservation keys are verified
atomically. Release reservation keys when an appointment is cancelled or completed.

## Validation and Query Requirements

- Every create, update, and delete validates same-tenant relationships server-side.
- Public discovery queries read only public projections; protected queries constrain
  `tenantId` and, for collaborator scope, `professionalId` where required.
- Firestore Rules deny cross-tenant reads/writes and role-incompatible writes; trusted
  functions repeat these checks because Admin SDK bypasses Rules.
- Build indexes for appointment queries by tenant/date, tenant/status/date,
  tenant/professional/date, message queries by tenant/connection/created time, contact
  queries by tenant/connection/update time, and active public catalog queries.
- Never log phone numbers, OTPs, full message content, or provider secrets.
