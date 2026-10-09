<!--
Sync Impact Report
Version change: 2.0.0 -> 3.0.0
Modified principles:
 - I. Domain and User Flow Integrity (redefined for business-specific SaaS catalogs)
 - Principles II-VIII remain unchanged
Added sections: none
Removed sections: none
Follow-up TODOs: None; `specs/004-saass-catalog-platform/spec.md` and its implementation tasks follow this principle.
-->
# Tamarcado Constitution

## Core Principles

### I. Domain and User Flow Integrity
The client application MUST present each business as an independently addressable public
catalog, identified by that business's public slug. Customers MUST enter a catalog through
the business's direct link; the client MUST NOT provide a centralized directory, search, or
marketplace for discovering businesses, products, or services. The root route MUST provide
neutral guidance to obtain a business link and MUST NOT act as a catalog or discovery page.

Within a business catalog, the platform MUST preserve the customer flow: product selection
→ professional selection when applicable → available time selection → customer contact
→ appointment creation. Catalog content and every booking step MUST remain associated with
the business identified by the current slug; the client MUST NOT display or submit another
business's data as a fallback.

A product MUST belong to a company, and a professional MAY be associated with one or more
products according to the business rules defined by the feature specification.

The collaborator application MUST focus on appointment management, customer management,
professional-specific reporting, and operational actions.

The backoffice application MUST focus on company administration, products, collaborators,
availability configuration, and business reporting.

Each application boundary MUST enforce its own responsibilities and MUST NOT expose
administrative capabilities through client-facing flows.

Rationale: Business-specific catalogs preserve each business's identity and customer
context, while keeping booking behavior and application responsibilities explicit.

### II. Booking and Availability Integrity
The system MUST prevent double booking of the same professional and time slot.

An appointment MUST only be created when the selected professional, product, date, and time
are valid and available at the moment of confirmation.

Working hours, existing appointments, blocked periods, and other availability constraints
MUST be considered before confirming an appointment.

Appointment status transitions MUST be explicit and validated. Invalid transitions MUST be
rejected.

Appointment edits MUST revalidate availability before persisting changes.

The system MUST use an explicit timezone strategy for storing, comparing, filtering, and
displaying appointment dates and times.

A customer-submitted appointment MUST remain pending until confirmed through an authorized
collaborator workflow.

Rationale: Appointment integrity is the core business invariant of the platform.

### III. Security and Authorization
Authentication MUST be based on verified phone numbers using the platform's supported
WhatsApp authentication flow.

Authentication alone MUST NOT grant access to resources outside the user's authorized role.

Every protected operation MUST perform server-side authorization checks.

Client, collaborator, and backoffice users MUST only access resources belonging to the
appropriate company, role, and ownership scope.

Phone numbers and other personal data MUST be treated as sensitive application data and MUST
not be exposed unnecessarily.

All external input MUST be validated before being used in business logic, persistence,
queries, integrations, or financial calculations.

Rationale: The platform handles customer contact information, business data, appointments,
and financial information, making authorization and data isolation mandatory.

### IV. Financial and Reporting Consistency
Product price and commission rules MUST be explicit and consistently applied across booking,
reporting, and administrative operations.

Transactional records MUST preserve the commercial values required to explain historical
results, even when the product price or commission configuration changes later.

Monthly reports MUST use a clearly defined reporting period and timezone.

Sales, commissions, rankings, and product reports MUST be calculated from authoritative
transactional data rather than duplicated or manually maintained totals.

Exports MUST represent the same data and business rules shown by the corresponding report.

Ranking views MUST only be presented when the configured business rule makes the ranking
meaningful; the UI MUST NOT invent or fabricate ranking data.

Rationale: Financial information must remain reproducible and auditable over time.

### V. Testability and Quality
Critical business rules MUST have automated tests.

Booking creation, availability validation, status transitions, appointment editing,
authorization, commission calculation, and report calculations MUST be covered by tests
appropriate to their risk.

User-facing critical flows MUST have behavior-oriented tests.

Tests MUST validate observable behavior and business outcomes rather than implementation
details.

Every feature implementation MUST preserve type safety, linting, formatting, and existing
automated tests.

A change that breaks an existing business invariant MUST NOT be merged without an explicit
change to the relevant specification and constitution-compatible implementation.

Rationale: The platform contains scheduling and financial rules where regressions can directly
affect customers and businesses.

### VI. Separation of Application Boundaries
The repository MUST keep the client, collaborator, and backoffice concerns clearly separated.

Shared domain concepts, contracts, validation rules, and reusable components MAY be shared
when doing so reduces duplication without coupling unrelated application behavior.

Business rules MUST NOT depend on presentation components.

Persistence, authentication, external integrations, and business logic MUST have clear
boundaries.

The architecture MUST make it possible to change a UI implementation without rewriting the
underlying domain rules.

Rationale: The three applications have different actors and permissions while sharing the
same business domain.

### VII. User Experience and Accessibility
The client booking flow MUST minimize the number of steps required to schedule an appointment.

Forms MUST provide clear validation and actionable error messages.

Phone numbers MUST be handled using a consistent Brazilian format with DDD.

Loading, empty, success, and error states MUST be explicitly designed for every critical
asynchronous operation.

Interactive elements MUST provide accessible labels, keyboard navigation where applicable,
appropriate focus behavior, and sufficient semantic information.

The interface MUST be responsive and usable on common mobile and desktop screen sizes.

Rationale: Customers may access the platform primarily through mobile devices, while
collaborators and administrators require efficient operational workflows.

### VIII. Maintainability and Simplicity
The simplest design that satisfies the current specification SHOULD be preferred over
premature abstraction.

New abstractions MUST have a clear reuse or domain justification.

Duplicated business rules MUST be consolidated whenever they represent the same domain
behavior.

Magic values, duplicated status definitions, duplicated financial formulas, and duplicated
validation rules MUST be avoided.

Code structure MUST make business intent easy to locate and understand.

Observability and error handling MUST be explicit for critical operations, especially
authentication, appointment creation, appointment updates, messaging, and financial reporting.

Rationale: The platform is expected to evolve, and maintainability is necessary to support
new products, collaborators, companies, and business rules without increasing accidental
complexity.

## Technology and Specification Boundaries

Specifications MUST describe user behavior, business rules, constraints, and acceptance
criteria.

Specifications MUST NOT prescribe implementation details unless those details are themselves
a business constraint.

Technical architecture, frameworks, libraries, infrastructure, persistence strategy, API
design, and deployment decisions belong to the `plan` phase.

## Spec-Driven Workflow

Tasks MUST be derived from the approved specification and technical plan.

Implementation MUST NOT introduce functionality that is outside the approved specification
without updating the corresponding specification first.

## Governance

This constitution is the highest-level project authority for engineering decisions.

All specifications, plans, tasks, and implementations MUST be evaluated against the
principles defined here.

The `Constitution Check` in implementation plans MUST identify applicable principles and any
potential violations.

A conflict between a feature request and this constitution MUST be resolved by changing the
feature specification or constitution explicitly; developers MUST NOT silently bypass a
principle.

Constitution amendments MUST include a clear rationale, a semantic version change, and an
updated amendment date. All affected specifications, plans, tasks, and implementations MUST
be reviewed for compliance after an amendment.

Versioning follows Semantic Versioning:

- MAJOR: removal, replacement, or backward-incompatible redefinition of a principle.
- MINOR: addition of a new principle or materially expanded governance rule.
- PATCH: clarification, wording correction, or non-semantic refinement.

Every implementation MUST preserve existing automated tests unless the related specification
explicitly changes the expected behavior.

**Version**: 3.0.0 | **Ratified**: 2026-10-02 | **Last Amended**: 2026-10-08
