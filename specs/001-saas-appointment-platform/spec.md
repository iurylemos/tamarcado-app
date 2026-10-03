# Feature Specification: SaaS Appointment Commerce Platform

**Feature Branch**: `001-saas-appointment-platform`

**Created**: 2026-10-03

**Status**: Ready for Planning

**Input**: User-provided platform document, “Plan — SaaS Multi-Tenant Appointment Platform”

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Discover a business and book a service (Priority: P1)

A customer can find a business, explore its services, choose an eligible professional when
needed, select an available time, and submit an appointment request with a Brazilian phone
number including DDD. The customer can complete this flow without a collaborator or backoffice
account.

**Why this priority**: Customer discovery and appointment requests are the platform's primary
public value.

**Independent Test**: Starting with a published business catalog and available working hours,
complete a booking as a customer and verify the requested service, time, contact details, and
pending status.

**Acceptance Scenarios**:

1. **Given** a published business with active services, **When** a customer opens its public
   page, **Then** the customer can browse that business's services and the minimum public
   information needed to book.
2. **Given** an active service with one eligible professional, **When** the customer selects
   an available time, **Then** the system selects that professional without requiring an
   unnecessary choice.
3. **Given** an active service with multiple eligible professionals, **When** the customer
   proceeds to choose a time, **Then** the customer can select only professionals eligible
   for that service and time.
4. **Given** a valid available time and contact phone with DDD, **When** the customer submits
   the request, **Then** an appointment is created as pending; a WhatsApp confirmation is
   sent only when the customer has opted in to that business's messages.

---

### User Story 2 - Configure a business and its availability (Priority: P1)

A backoffice user can manage a business catalog, professionals, service assignments, working
hours, and blocked periods so that customers can book only services and times the business
actually offers.

**Why this priority**: A usable catalog and trustworthy availability are prerequisites for
customer booking and daily operations.

**Independent Test**: Configure a business, service, professional, service assignment, and
working hours; verify the public catalog and offered appointment times reflect those choices.

**Acceptance Scenarios**:

1. **Given** an authorized backoffice user, **When** they create or update a service, **Then**
   they can manage its description, image, price, duration, commission rule, and active state.
2. **Given** an authorized backoffice user, **When** they associate a professional with one
   or more services or assign collaborator access, **Then** booking eligibility and workspace
   permissions reflect only those active business-owned associations.
3. **Given** configured working hours and blocked periods, **When** a customer checks
   availability, **Then** times outside working hours, during blocks, or conflicting with
   appointments are not offered.
4. **Given** a business with multiple locations or timezone needs, **When** its operating
   timezone is configured, **Then** appointment times and monthly reporting use that
   business-local timezone consistently.

---

### User Story 3 - Manage appointments and customers (Priority: P1)

A collaborator can review appointments for their authorized business and professional scope,
contact customers, manage permitted appointment changes, and maintain the operational
appointment lifecycle.

**Why this priority**: Collaborators need a reliable operational workflow to deliver booked
services and maintain accurate customer history.

**Independent Test**: Sign in as an authorized collaborator, inspect appointments in scope,
perform allowed status actions, and verify unauthorized appointments remain inaccessible.

**Acceptance Scenarios**:

1. **Given** an authenticated collaborator, **When** they open the appointment list, **Then**
   they see the customer, service, professional, date, time, status, and relevant commercial
   details for appointments in their authorized scope.
2. **Given** a pending appointment, **When** an authorized collaborator confirms or cancels
   it, **Then** the appointment moves only to a permitted status and the outcome is visible.
3. **Given** an appointment that is edited or rescheduled, **When** the collaborator saves
   the change, **Then** availability and authorization are revalidated before it is accepted.
4. **Given** an appointment, **When** the collaborator uses its contact action, **Then** the
   customer's phone is available only to the authorized user and any WhatsApp contact action
   follows the customer's consent and applicable messaging rules.

---

### User Story 4 - Review business performance and commissions (Priority: P2)

Collaborators can review their own monthly sales and commission, while backoffice users can
review business sales, performance by service and collaborator, and exportable report data.

**Why this priority**: Accurate reporting supports business and professional decisions after
the booking and operational records exist.

**Independent Test**: Create representative appointments with different statuses and
commercial terms, then compare each role's report and export with the eligible source
transactions for the selected period.

**Acceptance Scenarios**:

1. **Given** a collaborator with eligible completed transactions, **When** they view a month,
   **Then** the report shows sales and commission calculated using the commercial terms
   recorded for each transaction.
2. **Given** a backoffice user and a reporting period, **When** they filter sales by service
   or collaborator, **Then** the report reflects the same eligible transactions and rules as
   the overall business report.
3. **Given** a report with export capability, **When** the user exports it, **Then** the
   exported records and totals match the report's filters and business rules.
4. **Given** a business with fewer eligible collaborators than required for a meaningful
   ranking, **When** the monthly overview is opened, **Then** it does not present a
   misleading ranking.

---

### User Story 5 - Access the right business workspace securely (Priority: P1)

Collaborators and backoffice users can authenticate using a verified phone number through
the supported WhatsApp authentication flow. Each user can access only capabilities and
business data allowed by their role and ownership scope.

**Why this priority**: Operational and administrative data must remain isolated by role and
business, independently of how a user enters the application.

**Independent Test**: Authenticate representative roles from two businesses and attempt
authorized and unauthorized reads and actions across their respective scopes.

**Acceptance Scenarios**:

1. **Given** an unverified phone number, **When** a user attempts protected access, **Then**
   the user is not authenticated.
2. **Given** an authenticated collaborator, **When** they request a backoffice-only action or
   another business's data, **Then** access is denied.
3. **Given** a public customer browsing a business, **When** they inspect the public catalog,
   **Then** they cannot access private customer, appointment, collaborator, or administrative
   information.

---

### User Story 6 - Exchange and track business messages (Priority: P3)

Authorized operational users can review relevant business contacts and message activity,
including whether messages are pending, sent, delivered, read, or failed.

**Why this priority**: Message visibility supports customer communication and operational
follow-up, but does not replace the booking and appointment lifecycle.

**Independent Test**: Review a business-scoped conversation with messages in each supported
delivery state and verify access boundaries and failure visibility.

**Acceptance Scenarios**:

1. **Given** an authorized user, **When** they open a business conversation, **Then** they
   see only contacts and messages within their authorized business scope.
2. **Given** a message delivery failure, **When** the conversation is refreshed, **Then** the
   failed status is visible and the appointment is not incorrectly marked confirmed.

### Edge Cases

- A customer submits a phone number that is malformed or lacks a Brazilian DDD.
- A customer does not opt in to WhatsApp messages or later withdraws that consent.
- Two customers request overlapping appointment times for the same professional at nearly
  the same time.
- A professional's service assignment, working hours, or blocked period changes while a
  customer is selecting a time.
- An appointment is edited into a period that is no longer available.
- A service, professional, or business becomes inactive while it is present in a customer's
  booking flow.
- A message provider is unavailable or reports a failed delivery after an appointment
  request is created.
- A monthly reporting period crosses a month boundary in the business's configured timezone.
- An appointment's service price or commission changes after the appointment was created.
- A user is authenticated but attempts to access another role's workspace or another
  business's data.
- A report has no eligible transactions or too few eligible professionals for a meaningful
  ranking.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow customers to discover published businesses and browse
  each business's active service catalog without collaborator or backoffice access.
- **FR-002**: The system MUST keep each service associated with exactly one business.
- **FR-003**: The system MUST allow customers to choose a service, select an eligible
  professional when a choice is applicable, review available times, and submit contact
  information.
- **FR-004**: The system MUST require a valid Brazilian customer phone number including DDD
  before accepting an appointment request.
- **FR-005**: The system MUST show appointment times according to service duration,
  the business's configured booking interval, professional eligibility, working hours,
  existing appointments, blocked periods, and the business's timezone.
- **FR-006**: The system MUST prevent conflicting appointments for the same professional,
  including simultaneous requests and appointments whose service durations overlap.
- **FR-007**: The system MUST revalidate authorization, service and professional eligibility,
  and current availability when creating or editing an appointment.
- **FR-008**: Customer-submitted appointments MUST begin in a pending state and MUST NOT be
  confirmed solely because a WhatsApp message was sent or delivered.
- **FR-009**: The system MUST define and enforce valid appointment status transitions;
  unauthorized or invalid transitions MUST be rejected.
- **FR-010**: Authorized collaborators MUST be able to review and perform permitted
  appointment operations within their role and business scope.
- **FR-011**: Authorized collaborators MUST be able to view relevant customer history and
  initiate a WhatsApp contact action when consent and applicable messaging rules permit,
  without exposing customer phone numbers to unauthorized users.
- **FR-012**: Authorized backoffice users MUST be able to manage business details, services,
  service prices and durations, commission rules, professional profiles, collaborator
  profiles and access, service assignments, working hours, and blocked periods.
- **FR-013**: Collaborator and backoffice authentication MUST use verified phone numbers
  through the supported WhatsApp authentication flow.
- **FR-014**: Authentication MUST be separate from authorization; every protected operation
  MUST enforce the user's role, business ownership, and resource scope.
- **FR-015**: Public business discovery MUST expose only the information necessary for the
  customer-facing catalog and booking journey.
- **FR-016**: Appointment records MUST retain the service name, price, and commission terms
  needed to explain historical sales and commission after current catalog settings change.
- **FR-017**: Collaborator and backoffice reports MUST calculate sales and commissions from
  authoritative appointment transactions and apply explicit appointment-status eligibility
  rules.
- **FR-018**: Monthly reports MUST use a clearly defined month and the business's configured
  timezone.
- **FR-019**: Backoffice reporting MUST support monthly sales, sales by service, sales by
  collaborator, and data export using the same filters and calculation rules as the displayed
  report.
- **FR-020**: The system MUST display collaborator rankings only when the configured business
  rule makes the comparison meaningful.
- **FR-021**: Authorized operational users MUST be able to inspect business-scoped contacts
  and message delivery states; messaging failures MUST remain visible.
- **FR-022**: The system MUST capture and honor customer consent for WhatsApp messages
  separately from authentication verification and MUST stop non-essential messages when
  consent is withdrawn.
- **FR-023**: Critical asynchronous operations MUST provide loading, empty, success, and
  actionable error states.
- **FR-024**: Customer-facing forms MUST provide clear validation messages, and interactive
  experiences MUST be usable with accessible labels, keyboard navigation where applicable,
  and responsive layouts.
- **FR-025**: Critical business behavior MUST be verifiable through tests of booking,
  availability, appointment transitions and edits, authorization, commission, reports, and
  core customer-facing journeys.

### Key Entities

- **Business**: A company using the platform, with its public identity, operating timezone,
  catalog, staff, and business reporting scope.
- **User**: A person with a verified phone number and an authorized collaborator or
  backoffice role for a business.
- **Service**: An offering belonging to one business, with customer-facing details, price,
  duration, commission terms, and active state.
- **Professional**: A service provider associated with a business and eligible for assigned
  services according to their availability.
- **Service Assignment**: The association that determines which professionals may provide
  which services.
- **Availability Rule**: A business or professional's working hours and blocked periods
  governing bookable times.
- **Customer**: A person requesting or receiving a service, identified for contact and
  appointment history by their phone number and any supplied name.
- **Appointment**: A requested or agreed service at a scheduled time, with a professional
  where applicable, a lifecycle status, customer contact, and historical commercial values.
- **Contact and Message**: Business-scoped communication information and a message's
  direction, content, and delivery state.
- **Report**: A period-based presentation or export of sales and commission derived from
  eligible appointments.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In usability validation, at least 90% of first-time customers complete the
  public discovery-to-pending-appointment flow without assistance.
- **SC-002**: For all verified booking attempts in acceptance and concurrency tests, no
  professional has overlapping active appointments.
- **SC-003**: In authorization validation, 100% of tested cross-business and out-of-role
  access attempts are denied.
- **SC-004**: For all tested appointment and report records, historical prices, commissions,
  monthly totals, filtered results, and exports agree with their defined source transactions.
- **SC-005**: Every tested critical asynchronous customer and operational flow presents
  observable loading, empty, success, or actionable error feedback as applicable.
- **SC-006**: Every supported appointment transition, including invalid transition attempts,
  produces the specified state change or rejection.
- **SC-007**: Customer, collaborator, and backoffice primary workflows remain usable at
  common mobile and desktop viewport sizes and by keyboard where applicable.

## Assumptions

- The initial product supports one business timezone per business; `America/Sao_Paulo` is the
  default when no business-specific timezone has been configured.
- A service has a defined duration so that its bookable times and conflicts can be
  calculated.
- Bookable start times use a business-configured interval in five-minute multiples,
  defaulting to 15 minutes.
- The initial scope covers booking and operational sales/commission reporting, not customer
  payment processing or SaaS subscription billing.
- Business creation and initial backoffice access are provisioned through an authorized
  administrative process; public self-service SaaS signup is not included.
- The platform uses an external, supported WhatsApp-capable provider for phone verification
  and messaging; selecting and configuring that provider is a planning decision.
- Appointment messages are sent only under the customer's explicit, business-specific
  WhatsApp opt-in; authentication verification does not grant appointment-message consent.
- Report status eligibility and commission formulas will be explicitly defined in design
  before implementation; historical transaction terms remain authoritative.
- Customers may submit appointment requests without creating an account.
