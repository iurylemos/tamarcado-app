<!--
Sync Impact Report
Version change: unversioned scaffold -> 1.0.0
Modified principles:
- Initial scaffold principle 1 -> I. Company Catalog and Customer Booking
- Initial scaffold principle 2 -> II. Reliable Appointment Lifecycle
- Initial scaffold principle 3 -> III. Role-Based Access and Accountability
- Initial scaffold principle 4 -> IV. Accurate Sales and Commission Reporting
- Initial scaffold principle 5 -> V. Privacy, Reliability, and Verifiable Quality
Added sections: Product and Platform Constraints; Delivery and Quality Workflow
Removed sections: none
Follow-up TODOs: Confirm the original ratification date.
-->
# Tamarcado Constitution

## Core Principles

### I. Company Catalog and Customer Booking
The client experience MUST present companies as the primary discovery unit and provide
segment filtering. Products MUST be browsed within a company's catalog. A customer
booking MUST capture the selected product, an available time, and a contact telephone
number including DDD. The customer MUST choose a professional only when more than one
eligible professional is available for that product and time. WhatsApp MUST be used for
appointment confirmation contact.

### II. Reliable Appointment Lifecycle
The system MUST prevent conflicting bookings for the same professional and time, including
concurrent requests. Appointment creation and changes MUST validate current availability
on the server. Appointments MUST have explicit statuses and authorized collaborators MUST
be able to confirm, cancel, or edit them. A booking submitted by a customer MUST remain
pending until confirmed through the authorized workflow.

### III. Role-Based Access and Accountability
The product MUST keep client, collaborator, and backoffice experiences and permissions
distinct. Collaborators MUST access only the appointments, customer information, and
reports needed for their work. Backoffice users MUST manage company products, prices,
commissions, collaborator profiles, working hours, and product associations. Identity
MUST be authenticated, and every privileged operation MUST be authorized server-side;
hiding an interface control is not authorization.

### IV. Accurate Sales and Commission Reporting
Sales and commission reports MUST derive from persisted appointment and product data and
apply a clearly defined status and date range. Collaborator reporting MUST show monthly
sales and commission. Backoffice reporting MUST support filtering and extracting sales by
product, and the monthly overview MUST rank collaborators when there is more than one.
Customer history MUST show service counts and the month and year of the most recent
service. Changes that affect a report MUST preserve an auditable source of truth.

### V. Privacy, Reliability, and Verifiable Quality
The system MUST collect and expose only the personal data required for booking and
operations, protect customer telephone numbers, and enforce access controls in database
rules and trusted server code. Core booking, authorization, appointment status, sales,
and commission behavior MUST have automated tests. Changes to shared data contracts or
cross-role workflows MUST include integration-level validation. External messaging
failures MUST be visible and MUST NOT silently turn an unconfirmed appointment into a
confirmed one.

## Product and Platform Constraints

- Firebase Authentication MUST provide user identity; Firestore MUST be the persistent
  application data store; Cloud Functions MUST enforce privileged business operations
  and server-side booking validation.
- Phone-based authentication and WhatsApp messaging MUST use supported integrations.
  Firebase Authentication MUST NOT be treated as if it natively authenticates users
  through WhatsApp; provider capabilities and delivery outcomes MUST be handled explicitly.
- Appointment and availability data MUST support date-based filtering. Product records
  MUST support a cover photo, price, and commission. Collaborator records MUST support
  name, telephone with DDD, photo, working hours, and associated products.
- The client booking flow MUST show available times for the selected product and, where
  applicable, professional. The collaborator appointment view MUST expose customer,
  date and time, status, product cover, price, status-appropriate actions, and a direct
  WhatsApp contact action.
- The backoffice MUST be able to manage products and collaborators and inspect monthly
  sales. Reports MUST expose filters and a usable sales extraction by product.

## Delivery and Quality Workflow

- Feature specifications MUST identify affected roles, authorization boundaries,
  appointment states, and acceptance criteria before implementation.
- Tests for booking MUST cover unavailable times, simultaneous conflicting requests,
  products with one or multiple eligible professionals, and pending-to-confirmed or
  pending-to-cancelled transitions.
- Tests for reports MUST cover date boundaries, appointment status eligibility, product
  sales, and commission calculations. Changes to commission or status rules MUST include
  regression coverage.
- Review MUST verify Firebase Security Rules and Cloud Functions enforce the same access
  and data-integrity requirements as the user interface.
- WhatsApp integrations MUST be tested for success and failure behavior without exposing
  secrets or customer data in logs.

## Governance

This constitution is the governing standard for product specifications, implementation,
and review. Amendments MUST be documented in this file and reviewed for their effect on
existing features, data, security rules, and tests. Any necessary migration or rollout
impact MUST be documented before implementation. Every feature review MUST check the
relevant principles and constraints; deviations MUST be justified in the feature
specification and explicitly approved.

Constitution versions use semantic versioning: MAJOR for incompatible changes to
principles or governance, MINOR for new principles or materially expanded requirements,
and PATCH for clarifications that do not change requirements. The version and amendment
date MUST be updated with every approved change. The original ratification date MUST
remain unchanged once confirmed.

**Version**: 1.0.0 | **Ratified**: TODO(RATIFICATION_DATE): Confirm original adoption date. | **Last Amended**: 2026-10-02
