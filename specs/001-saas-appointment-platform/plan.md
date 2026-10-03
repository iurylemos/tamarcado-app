# Implementation Plan: SaaS Appointment Commerce Platform

**Branch**: `001-saas-appointment-platform` | **Date**: 2026-10-03 | **Spec**:
[spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-saas-appointment-platform/spec.md`, derived
from the user-provided platform document.

## Summary

Deliver a multi-tenant appointment commerce platform through three distinct web applications:
public discovery and booking (`client`), professional operations (`collaborator`), and
business administration/reporting (`backoffice`). Use React, TypeScript, and Vite for the
applications, with Firebase Authentication, Firestore, and Cloud Functions for identity,
tenant-scoped persistence, and trusted operations. Deploy the applications as separate
Firebase Hosting sites. Render public business/service pages as HTML through a Vite-compatible
SSR function so those pages are crawlable; keep role workspaces as static applications.

Appointment creation and edits use authoritative server validation plus transactional
reservation keys to prevent overlapping bookings. Appointment records preserve historical
service and commission terms. Messaging and WhatsApp verification sit behind trusted,
provider-neutral integrations. The repository currently contains Spec Kit documentation but
no application source; the tree below describes the planned future structure.

## Technical Context

**Language/Version**: TypeScript; exact version and Node.js runtime to be pinned to versions
supported by the selected Firebase Functions runtime during implementation.

**Primary Dependencies**: React, Vite, Tailwind CSS, Firebase Web SDK, Firebase Admin SDK,
Firebase Cloud Functions, Firebase Authentication, Vitest, Testing Library, and a
WhatsApp-capable verification/messaging provider behind a server-side adapter.

**Storage**: Cloud Firestore using root-level collections only; every tenant-owned document
contains a validated `tenantId`. Appointment times are UTC instants; working schedules and
report boundaries use the business's configured IANA timezone.

**Testing**: Vitest and Testing Library for frontends and backend domain/functions; Firebase
Emulator Suite for integration tests of Authentication, Firestore Rules, and trusted
operations. Add concurrency, authorization, messaging failure, and report reconciliation
coverage.

**Target Platform**: Mobile-responsive and desktop web browsers; public pages must deliver
crawlable HTML. Backend operations run on Firebase Cloud Functions and public static assets
on Firebase Hosting.

**Project Type**: Multi-application web product with three role-separated frontends, a trusted
serverless backend, and a shared domain-contract layer.

**Performance Goals**: No traffic or latency SLA was supplied. The first release must meet
the correctness gates of zero accepted overlapping bookings and zero cross-tenant access;
instrument public discovery, availability, booking, and reports and establish load/latency
budgets before production scale-up.

**Constraints**:

- Follow the user document's React/TypeScript/Vite, Firebase, Tailwind, functional-module,
  and no-Firestore-subcollections direction.
- Tenant ownership and role MUST be derived from trusted authentication context, never
  accepted from a request body as authorization.
- Firestore Rules protect direct client access; trusted backend operations independently
  authorize because Admin SDK calls bypass Rules.
- Public catalog data MUST exclude private customer, commission, and administrative fields.
- External side effects such as WhatsApp sends MUST occur after the appointment transaction
  commits.
- Exact WhatsApp provider, sender onboarding, cloud region, supported runtime version, and
  production load target remain deployment/task decisions; they do not block the domain
  design.

**Scale/Scope**: Initial SaaS release covering multiple businesses; one business timezone
per business; customer discovery and booking; collaborator appointment/customer operations;
backoffice catalog, professional, availability, and reporting operations; business-scoped
WhatsApp verification and messaging. Payment processing and SaaS subscription billing are
out of scope.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Design Gate: PASS

- **I. Domain and User Flow Integrity**: The spec follows discovery → catalog → service →
  professional when applicable → availability → customer contact → pending appointment,
  with distinct client, collaborator, and backoffice responsibilities.
- **II. Booking and Availability Integrity**: The design requires server-side revalidation,
  overlap protection, explicit status transitions, edits that revalidate, and a business
  timezone strategy.
- **III. Security and Authorization**: Role and tenant checks apply to every protected
  operation. Public catalog projection is separated from private business records. Phone
  and customer data remain restricted.
- **IV. Financial and Reporting Consistency**: Appointment transactions retain commercial
  snapshots; reports and exports share one rule set and a defined monthly period.
- **V. Testability and Quality**: The test strategy covers booking concurrency, availability,
  status transitions, authorization, commission, reporting, and observable user flows.
- **VI. Separation of Application Boundaries**: Client, collaborator, backoffice, backend,
  and shared domain responsibilities are separated.
- **VII. User Experience and Accessibility**: Mobile-responsive flows, validation, async
  states, semantic labels, and keyboard operation are acceptance requirements.
- **VIII. Maintainability and Simplicity**: Shared domain functions centralize business
  rules; no additional abstraction is introduced without reuse justification.

No constitutional violations or exceptions are requested.

## Project Structure

### Documentation (this feature)

```text
specs/001-saas-appointment-platform/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── appointment-operations.md
│   ├── public-booking.md
│   ├── reporting-export.md
│   └── whatsapp-integration.md
├── checklists/
│   └── requirements.md
└── tasks.md                 # Created by /speckit-tasks, not this plan
```

### Source Code (planned; none exists in the repository yet)

```text
client/
├── src/
│   ├── components/{atoms,molecules,organisms,templates}/
│   ├── contexts/
│   ├── interfaces/
│   ├── pages/
│   ├── services/
│   ├── utils/
│   ├── config/
│   └── styles/
└── tests/

collaborator/
├── src/                     # Same presentation structure, role-specific workflows
└── tests/

backoffice/
├── src/                     # Same presentation structure, administrative workflows
└── tests/

functions/
├── src/
│   ├── functions/{appointments,authentication,messages,reports,users,tenants}/
│   ├── model/
│   ├── services/
│   ├── utils/
│   └── config/
└── tests/

shared/
└── domain/                  # Typed contracts, validation, statuses, calculations

design-system.md
firebase.json
firestore.rules
firestore.indexes.json
```

**Structure Decision**: Keep the three actor applications separate as required by the
constitution and source document. Use `functions/` for trusted operations and `shared/domain/`
only for stable cross-application domain contracts and pure business rules. Keep
presentation-specific interfaces and components in each application; do not share UI
behavior across role boundaries. Deploy the three frontends to separate Firebase Hosting
sites in the selected Firebase project.

**Utility convention (T020)**: Date and time utilities are named, pure functions in
`src/utils/date.util.ts`; do not add static-only utility classes. Shared timezone rules belong in
`shared/domain/timezone.ts` so the browser and trusted backend use the same business-local rules.

## Design Decisions

1. **Public catalog boundary**: Maintain a minimal public projection of business and service
   details (or return it through a trusted public read function). Never publish full private
   service documents containing commission rules.
2. **Identity and tenancy**: Verify WhatsApp OTP through the selected external provider;
   issue Firebase custom tokens only after trusted verification. Server-issued claims carry
   current `tenantId` and role. Backend functions verify those claims and the target
   resource's `tenantId`. Refresh/revoke identity after membership or role changes.
3. **Firestore layout**: Use root collections and explicit tenant fields, following the
   supplied no-subcollections rule. Add compound indexes for appointment, contact, product,
   and message query patterns as actual screens are defined.
4. **Booking integrity**: Use half-open appointment intervals and deterministic reservation
   records for every intersecting five-minute quantum. Customer-facing start intervals must
   be multiples of five minutes (15-minute default). Create appointment plus reservations
   atomically; validate active business/service, professional-service association, working
   hours, blocked periods, and reservation availability inside the trusted operation.
5. **Appointment lifecycle**: Allow `pending → confirmed`, `pending → cancelled`, and
   `confirmed → completed`. Treat `cancelled` and `completed` as terminal. Only pending and
   confirmed appointments may be rescheduled; rescheduling preserves status and must claim
   the new interval before releasing the old one within the same atomic operation. Other
   administrative corrections require a separately approved business rule.
6. **WhatsApp side effects**: Send messages only after persistence commits and only according
   to the business-specific customer opt-in and applicable template rules. Store provider
   identifiers and map provider callbacks to visible delivery states; message failure never
   changes appointment status.
7. **Financial calculation**: Snapshot price and commission terms when a pending appointment
   is created. Include only `completed` appointments in sales and commission reports. Store
   BRL monetary values in integer cents; calculate percentage commissions from the snapshotted
   price and round half-up to cents. Fixed commission is snapshotted as cents.
8. **Reports**: Use appointment transactions as the authoritative source. Derived monthly
   aggregates are rebuildable projections. Apply business-local month boundaries and identical
   filters/calculations to on-screen results and UTF-8 CSV exports. Rank only collaborators
   with eligible transactions when at least three collaborators are present.
9. **Realtime**: Use scoped realtime subscriptions for operational appointments and messages
   where live updates materially improve collaborator workflows. Keep catalog, reports, and
   administrative forms request-driven unless realtime is needed; always scope subscriptions
   to tenant, role, professional, and date filters and release them when no longer needed.
10. **SEO**: Serve route-specific HTML and metadata for public business/service pages through a
    Vite-compatible SSR Cloud Function behind Hosting rewrites. Keep collaborator and
    backoffice routes out of public rendering and shared caches. Confirm Hosting rewrite
    precedence and cache headers in deployment tasks.
11. **Errors and observability**: Use structured domain errors for invalid input, denied
    access, unavailable slots, provider failures, and unexpected faults. Log critical
    operation outcomes without phone numbers, OTPs, message bodies, or credentials.

## Delivery Sequence

The implementation tasks should follow the dependency order in the source document:

1. Foundation, shared domain contracts, design tokens, local test/emulator setup.
2. Business/user identity, trusted role and tenant resolution, and tenant isolation.
3. Public business/service catalog and crawlable business pages.
4. Professional catalog, service assignments, schedules, blocks, availability, and
   concurrency-safe appointment creation/editing.
5. WhatsApp verification, consent, messaging, and delivery-status integration.
6. Collaborator appointment/customer workflows and individual reports.
7. Backoffice catalog/staff/availability management and business reports/exports.
8. Security, accessibility, SEO, concurrency, integration, and performance hardening.
9. Firebase Hosting/Functions deployment and end-to-end validation.

## Post-Design Constitution Recheck: PASS

- Data, contracts, and planned operations maintain tenant and role boundaries across the
  client, collaborator, backoffice, and trusted backend.
- The transaction and reservation design covers simultaneous requests and overlapping
  service durations; edits revalidate availability.
- Appointment state transitions, business-local time handling, and historical financial
  snapshots are explicit and consistent across the data model and contracts.
- Public catalog projection and WhatsApp consent protect personal/business data; failed
  delivery does not imply successful appointment confirmation.
- Reports derive from source transactions, use a single calculation rule, and have a
  rebuildable projection plus consistent exports.
- Test scenarios and the quickstart map to the critical business invariants and observable
  user outcomes.
- The project structure keeps role applications and domain behavior separate without
  introducing a constitutional exception.

## Risks and Follow-up Decisions

- **WhatsApp provider and tenant onboarding**: Select a provider, validate business-specific
  sender setup, template approval, opt-in evidence, and fallback behavior before integration
  tasks.
- **SSR integration**: Vite does not have a turnkey Firebase Hosting SSR path. Validate the
  build/render/deploy workflow and crawler-visible output before investing in full catalog
  page coverage.
- **Booking contention**: Verify transaction limits and contention behavior with concurrent
  acceptance tests at the configured booking interval; monitor and surface exhausted retries.
- **Operational configuration**: Select compatible Firestore/Functions regions, supported
  Node.js runtime, billing plan, Hosting targets, and a launch load target before production
  deployment.
- **Business policy**: Completed-only reporting, 15-minute default booking intervals,
  percentage rounding, and the minimum of three eligible collaborators for the top-three
  ranking are explicit planning decisions based on gaps in the supplied document. Confirm
  them with the product owner before implementation.

## Complexity Tracking

No Constitution Check violations; no exceptions requested.
