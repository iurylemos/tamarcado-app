# Feature Specification: SaaS Multi-Tenant Appointment Platform

**Feature Branch**: `001-saas-appointment-platform`

**Created**: 2026-10-03

**Status**: Ready for Planning

**Input**: User-provided “Feature Specification — SaaS Multi-Tenant Appointment Platform”

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Discover a company and request an appointment (Priority: P1)

An unauthenticated customer can discover companies, filter by business segment, browse a
company's products or services, select an eligible professional when necessary, choose an
available appointment time, and submit a Brazilian phone number with DDD to request an
appointment.

**Why this priority**: Public discovery and appointment requests are the platform's primary
customer value.

**Independent Test**: Using published companies, products, professionals, and availability,
complete the flow as an unauthenticated customer and verify a valid pending appointment is
created without exposing private tenant data.

**Acceptance Scenarios**:

1. **Given** published companies in multiple segments, **When** a customer opens the public
   landing page and selects a segment, **Then** only matching companies are shown; no matches
   produce a clear empty state.
2. **Given** a selected company, **When** a customer opens its catalog, **Then** only that
   company's active products/services are shown with public image, name, description when
   available, and price.
3. **Given** a selected product with one eligible professional, **When** the customer
   proceeds to scheduling, **Then** that professional is selected automatically.
4. **Given** a selected product with multiple eligible professionals, **When** the customer
   opens professional selection, **Then** only active professionals associated with that
   product and company are selectable.
5. **Given** a selected professional and date, **When** the customer reviews appointment
   times, **Then** only times when that professional can provide the selected product are
   offered.
6. **Given** an invalid or unavailable appointment time or malformed phone number, **When**
   the customer submits the request, **Then** the request is rejected with an actionable
   message and no appointment is created.
7. **Given** a valid appointment request and Brazilian phone number with DDD, **When** the
   customer submits it, **Then** a pending appointment is created, the customer sees a success
   state, and any WhatsApp confirmation is sent only when the customer has opted in.

---

### User Story 2 - Manage appointments and customer history (Priority: P1)

An authenticated collaborator can view appointments within their authorized scope, filter
them by date, perform permitted appointment actions, contact customers through WhatsApp when
allowed, and review customer attendance history.

**Why this priority**: Collaborators need an accurate operational workspace to manage booked
services and customer follow-up.

**Independent Test**: Sign in as a collaborator, review and filter appointments, confirm or
cancel a pending appointment, and verify customer history and access restrictions.

**Acceptance Scenarios**:

1. **Given** an authenticated collaborator, **When** they view appointments, **Then** only
   appointments in their authorized business and professional scope appear, with customer,
   date, time, status, product image, product name, price, and status-appropriate actions.
2. **Given** appointments on different dates, **When** the collaborator filters by date,
   **Then** only appointments for that date in the configured timezone appear; clearing the
   filter restores the default view.
3. **Given** a pending appointment, **When** an authorized collaborator confirms or cancels
   it, **Then** only the corresponding permitted transition is persisted.
4. **Given** a confirmed appointment whose service was delivered, **When** an authorized
   collaborator marks it completed, **Then** it becomes eligible for attendance and sales
   reporting.
5. **Given** an appointment that may be edited, **When** the collaborator changes its date,
   time, or eligible professional, **Then** current tenant ownership, status, association,
   working hours, and availability are revalidated before the change is saved.
6. **Given** customers associated with the collaborator's authorized appointments, **When**
   the collaborator opens customer history, **Then** completed attendance count and the month
   and year of the latest completed attendance are shown.
7. **Given** a customer contact action, **When** the collaborator opens WhatsApp, **Then**
   the action uses that customer's phone only when access and applicable messaging consent
   permit it.

---

### User Story 3 - Administer a company and its services (Priority: P1)

An authenticated backoffice user can manage company products/services, collaborators,
professional assignments, working hours, and business availability.

**Why this priority**: The public catalog and valid availability depend on accurate
administrative data.

**Independent Test**: Create or update a company service, collaborator, service assignment,
and working hours; verify the public catalog and eligible appointment times reflect the
saved configuration.

**Acceptance Scenarios**:

1. **Given** an authorized backoffice user, **When** they create or edit a product/service,
   **Then** they can set its name, image, price, commission, and active state.
2. **Given** an authorized backoffice user, **When** they create or edit a collaborator,
   **Then** they can manage the collaborator's name, Brazilian phone number with DDD, photo,
   active state, working hours, and associated products.
3. **Given** a collaborator and product association, **When** the association is activated
   or removed, **Then** it applies only within the same company and does not change historical
   appointments.
4. **Given** an inactive product or collaborator, **When** a customer requests availability,
   **Then** that product or collaborator cannot be selected for a new appointment.
5. **Given** invalid working hours, **When** a backoffice user attempts to save them,
   **Then** the configuration is rejected with a clear explanation.

---

### User Story 4 - Review sales and commission reports (Priority: P2)

Collaborators can review their monthly sales and commission. Backoffice users can review
company sales, sales by collaborator, meaningful top-collaborator rankings, filter sales,
and export the filtered results.

**Why this priority**: Reliable financial reporting supports business decisions after
appointment operations are available.

**Independent Test**: Prepare appointments in different states and with different historical
prices/commission values; compare role-appropriate reports and exports against eligible
source transactions.

**Acceptance Scenarios**:

1. **Given** a collaborator with eligible transactions in the current month, **When** they
   open their report, **Then** monthly sales and commission use the commercial values
   recorded for those transactions.
2. **Given** a backoffice user, **When** they open the dashboard, **Then** they see current
   month company sales and sales grouped by collaborator.
3. **Given** at least three eligible collaborators, **When** the business dashboard displays
   its ranking, **Then** it shows the top three based on authoritative sales data; with fewer
   than three eligible collaborators, it does not fabricate entries.
4. **Given** a selected report period and product filter, **When** the backoffice user
   filters and exports sales, **Then** the displayed and exported results apply the same
   filters and financial rules.
5. **Given** a period with no eligible sales, **When** an authorized user opens the report,
   **Then** a clear empty state appears rather than invented totals.

---

### User Story 5 - Authenticate and access the correct company (Priority: P1)

Collaborators and backoffice users authenticate using a verified phone number through the
supported WhatsApp verification flow. Their role and company determine which application
capabilities and records they can access.

**Why this priority**: Sensitive customer, appointment, and financial information must be
isolated by company and role.

**Independent Test**: Authenticate users with different roles in two companies and attempt
allowed and disallowed operations through public, collaborator, and backoffice experiences.

**Acceptance Scenarios**:

1. **Given** an unauthenticated or unverified user, **When** they access a protected
   collaborator or backoffice function, **Then** access is denied.
2. **Given** an authenticated user without collaborator or backoffice authorization,
   **When** they request that workspace, **Then** access is denied.
3. **Given** a collaborator for company A, **When** they request company B's records or a
   backoffice-only operation, **Then** no protected data is returned and the operation is
   rejected.
4. **Given** an expired or invalid verification attempt, **When** a user attempts sign-in,
   **Then** authentication fails and the user receives an actionable error state.
5. **Given** an authenticated user who logs out, **When** they revisit a protected resource,
   **Then** access requires authentication again.

---

### User Story 6 - Track operational contacts and messages (Priority: P3)

Authorized company users can access their company's connections, contacts, and messages and
see message delivery state where operationally relevant.

**Why this priority**: Communication history supports customer operations while remaining
secondary to booking, appointment management, and reporting.

**Independent Test**: Review messages in multiple delivery states for one company and attempt
to access another company's connections, contacts, and messages.

**Acceptance Scenarios**:

1. **Given** a company user, **When** they view connections, contacts, and messages, **Then**
   all displayed records belong to the authorized company.
2. **Given** an incoming message or delivery-state change, **When** the relevant operational
   view is open, **Then** it reflects the update without an unnecessary full-page refresh
   where realtime behavior is supported.
3. **Given** a message delivery failure, **When** the user views the message, **Then** the
   failure is visible and the related appointment is not incorrectly confirmed.

### Edge Cases

- No companies match a selected segment, or a company has no active products.
- A product has zero, one, or multiple active professionals; none are available at the
  selected date and time.
- A professional, product, association, or company becomes inactive after availability was
  displayed but before the booking request is submitted.
- Two customers attempt to book overlapping time for the same professional concurrently.
- A time becomes unavailable between selection and final booking confirmation.
- A collaborator edits an appointment into blocked hours or a slot already reserved by
  another appointment.
- The phone number is missing, malformed, or does not include a valid Brazilian DDD.
- A WhatsApp verification code is invalid or expired, or the messaging provider fails.
- A customer has not opted in to WhatsApp messages or withdraws consent.
- An appointment's current product price or commission changes after the appointment was
  created.
- A reporting period crosses a month boundary in the configured timezone.
- Fewer than three collaborators have eligible sales for a top-three ranking.
- An authorized user requests another tenant's data using a client-supplied identifier.
- A required message or report operation returns no data or an actionable error.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a public landing page that lists companies available
  for discovery and allows filtering by business segment.
- **FR-002**: The system MUST show an empty state when company discovery or a selected
  segment has no matching companies.
- **FR-003**: The system MUST show a selected company's catalog with only products/services
  belonging to that company and intended for public display.
- **FR-004**: Public catalog entries MUST support a product image, name, optional
  description, and price; each bookable product/service MUST have a defined duration, and
  inactive products MUST NOT be bookable.
- **FR-005**: Each product/service MUST belong to exactly one company.
- **FR-006**: A professional MUST be eligible for booking a product only when an active
  association exists between them in the same company.
- **FR-007**: The booking flow MUST automatically select the professional when exactly one
  eligible professional is available, require customer selection when multiple are
  available, and prevent continuation when none are available.
- **FR-008**: The system MUST calculate availability using professional working hours,
  service duration, existing pending or confirmed appointments, active product associations,
  blocked periods, company ownership, selected date, and the company's configured timezone.
  Cancelled and completed appointments MUST NOT continue to reserve future availability.
- **FR-009**: The system MUST reject invalid or unavailable booking times and revalidate
  availability at appointment creation and edit.
- **FR-010**: The system MUST prevent two active appointments from occupying overlapping time
  for the same professional, including simultaneous booking requests.
- **FR-011**: Customers MUST provide a valid Brazilian phone number including DDD before an
  appointment request can be accepted; invalid values MUST produce clear validation.
- **FR-012**: An appointment record MUST contain the company, product, applicable
  professional, customer phone, scheduled time, initial status, and commercial values
  determined from the company's current product configuration when the request is accepted.
- **FR-013**: New appointments MUST start as `pending`. Authorized collaborators MUST be
  able to confirm or cancel pending appointments, and authorized collaborators MUST be able
  to mark confirmed appointments completed. Invalid status transitions MUST be rejected.
- **FR-014**: Appointment edits MUST revalidate company ownership, product, professional,
  active association, working hours, availability, and appointment status before saving.
- **FR-015**: Appointment records MUST preserve product/service identity, price, and
  commission information needed to explain historical results after current configuration
  changes.
- **FR-016**: The client application MUST provide a clear success state after a valid
  appointment request and MUST NOT expose private company data.
- **FR-017**: Collaborator and backoffice authentication MUST use verified phone numbers
  through the supported WhatsApp verification flow. Invalid or expired verification MUST NOT
  grant access.
- **FR-018**: Authentication MUST be separate from authorization. Every protected operation
  MUST enforce the user's role, company ownership, and applicable professional scope
  independently of frontend filtering.
- **FR-019**: Logging out MUST end access to protected collaborator and backoffice resources.
- **FR-020**: The collaborator experience MUST display authorized appointments with the
  customer, date, time, status, product image, product name, price, and status-appropriate
  actions.
- **FR-021**: Collaborators MUST be able to filter appointments by date using the configured
  timezone; no matches MUST produce an empty state.
- **FR-022**: Authorized collaborators MUST be able to view customer contact details,
  completed appointment/attendance count, and the month and year of the latest completed
  attendance.
- **FR-023**: A WhatsApp customer-contact action MUST be available only to an authorized
  collaborator and MUST respect applicable customer consent and messaging rules.
- **FR-024**: Collaborators MUST be able to view their monthly sales and commission.
- **FR-025**: Authorized backoffice users MUST be able to view current-month company sales
  and sales grouped by collaborator.
- **FR-026**: The backoffice MUST show a top-three collaborator ranking only when at least
  three collaborators have eligible sales; ranking values MUST derive from authoritative
  transactions and MUST NOT be fabricated.
- **FR-027**: Authorized backoffice users MUST be able to create and edit products/services,
  including image, valid price, commission, and active/inactive state.
- **FR-028**: Authorized backoffice users MUST be able to create and edit collaborators,
  including name, validated Brazilian phone with DDD, photo, active state, working hours,
  and product associations.
- **FR-029**: The system MUST reject product/professional associations that cross company
  ownership and MUST preserve historical appointments when an association is removed.
- **FR-030**: The system MUST reject invalid working-hour intervals, including an end time
  less than or equal to the start time unless an explicitly approved business rule permits
  an overnight interval.
- **FR-031**: The backoffice MUST support sales reports filterable at minimum by reporting
  period and product, and MUST allow users to export the filtered results.
- **FR-032**: Sales and commission reports MUST derive from authoritative transactional
  appointment data and use the commercial values applicable to each transaction.
- **FR-033**: Displayed report results and exports MUST apply identical filters, status
  eligibility, timezone boundaries, and financial calculations.
- **FR-034**: Connections, contacts, and messages MUST retain explicit company and parent
  references, support multiple connections per company and multiple contacts/messages per
  parent, and remain isolated by company.
- **FR-035**: Operational message updates SHOULD appear in realtime when timely updates
  materially improve the user flow; messaging failure MUST NOT change appointment status.
- **FR-036**: Critical asynchronous operations MUST provide loading, empty, success, and
  actionable error states as applicable.
- **FR-037**: Customer-facing and operational flows MUST be responsive and provide
  accessible labels, semantic information, keyboard navigation where applicable, and
  appropriate focus behavior.
- **FR-038**: Critical booking, tenant isolation, authorization, appointment lifecycle and
  editing, customer history, commission, report, and export behavior MUST be validated
  against observable business outcomes.

### Key Entities

- **Company/Tenant**: A business on the platform, with its own public identity and isolated
  users, catalog, appointments, contacts, and reports.
- **User**: An authenticated person associated with a company and an authorized role.
- **Product/Service**: A company-owned offering with public information, image, price,
  commission terms, active state, and any booking duration required by the availability
  rules.
- **Professional/Collaborator**: A company-associated service provider with a profile,
  working hours, active state, and permitted product associations.
- **Product/Professional Association**: A company-owned relationship that determines which
  professionals may provide which products/services.
- **Working Hours and Blocked Period**: Availability rules that determine bookable dates and
  times for a professional or company.
- **Customer**: A person identified by a validated Brazilian phone number and associated
  appointment/attendance history.
- **Appointment**: A pending or managed request for a company product/service at a date and
  time, associated with a customer and applicable professional, preserving historical
  commercial values.
- **Connection, Contact, and Message**: Company-owned communication records linked to
  contacts and messages, with message direction and delivery status.
- **Report**: A role-appropriate, period-based view/export of sales and commissions derived
  from eligible appointments.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 90% of first-time customers in usability validation can discover a
  company and submit a valid pending appointment without assistance.
- **SC-002**: In all booking acceptance and concurrency tests, no professional has two
  overlapping active appointments.
- **SC-003**: In all tested cross-company and out-of-role access attempts, 100% are rejected
  without returning protected data.
- **SC-004**: In all tested report cases, displayed and exported sales and commission totals
  reconcile exactly to eligible source appointments and their historical commercial values.
- **SC-005**: All tested invalid phone numbers, unavailable slots, invalid working hours,
  invalid status transitions, and unauthorized operations are rejected with an actionable
  user-facing outcome.
- **SC-006**: Every tested critical asynchronous flow presents the appropriate loading,
  empty, success, or error state.
- **SC-007**: The top-three ranking appears only when at least three collaborators have
  eligible sales and contains no fabricated values.
- **SC-008**: Customer, collaborator, and backoffice primary flows remain usable at 360 x 640
  mobile and 1280×720 desktop viewport sizes, including keyboard navigation where applicable.

## Assumptions

- The platform supports a configurable business timezone and defaults to `America/Sao_Paulo`
  for Brazilian businesses.
- A product/service has a defined duration, and businesses have a configurable booking
  interval in five-minute multiples with a 15-minute default.
- Only completed appointments count as sales and commission in the initial reports; the
  product owner must confirm this policy before implementation.
- Historical appointment price, commission terms, and product identity are captured when
  the appointment is created and are not silently changed by later catalog edits.
- A customer may request an appointment without creating an account.
- Appointment WhatsApp messages require explicit business-specific customer opt-in; phone
  verification for staff authentication does not imply messaging consent.
- The exact company segment values are managed as product configuration or seed data and
  are not fixed by this specification.
- Initial company setup and backoffice authorization are provisioned by an authorized
  process; public self-service SaaS registration is outside this feature.
- Customer phone ownership is declared by the customer and validated for Brazilian format;
  customer account creation or phone verification is not required for the initial booking
  flow.
- Detailed retention periods, legal compliance requirements, and message fallback policy
  require review before production launch.
