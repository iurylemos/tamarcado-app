# Feature Specification: Observability and Logs

**Feature Branch**: Not created; feature identifier `008-observability-and-logs`

**Created**: 2026-10-14

**Status**: Draft — Review Required

**Input**: Review and plan observability for the client, collaborator, and backoffice frontends and Firebase Cloud Functions, using Sentry for frontend error monitoring and native Firebase/Google Cloud structured logging for backend operations unless research shows a concrete gap.

## Objective

Let operators diagnose unexpected frontend and backend failures across the four application workspaces while preserving existing user-facing behavior and preventing personal, authentication, business-sensitive, or message data from being sent to monitoring systems.

The initial scope is error reporting and operational logs. It does not add session replay, product analytics, a general-purpose tracing/APM platform, or a second backend error sink unless approved planning demonstrates that native backend logs cannot meet a requirement.

## User Scenarios & Testing

### User Story 1 - Diagnose frontend failures (Priority: P1)

As an operator supporting customers and staff, I want unexpected errors from each frontend to be reported with enough safe application and release context to find the failing flow, so that I can investigate failures without reproducing them from private user data.

**Why this priority**: The three browser applications are separate production entry points and currently have no common error-reporting destination.

**Independent Test**: Trigger one controlled render error, one uncaught exception, and one unhandled rejected promise in each application in a non-production test environment. Verify each is reported once with the correct application, environment, release, and safe route context, and that no sensitive input is present.

**Acceptance Scenarios**:

1. **Given** an unexpected rendering error occurs in any frontend, **When** the application handles it, **Then** an error report is available to authorized operators and the current user-facing recovery behavior remains usable.
2. **Given** an uncaught browser exception or unhandled promise rejection occurs, **When** monitoring processes it, **Then** the report identifies the frontend, deployed release, environment, and route pattern without including query strings, fragments, or user-entered content.
3. **Given** the user navigates between routes before an error, **When** an operator inspects the report, **Then** relevant navigation context is available without capturing full URLs containing sensitive parameters.
4. **Given** an expected validation, authorization, or recoverable network outcome occurs, **When** it is handled by the application, **Then** it is not incorrectly reported as an unhandled application failure or duplicated as both handled and unhandled events.

---

### User Story 2 - Diagnose backend operation failures (Priority: P1)

As an operator, I want useful, structured records for important server operations and unexpected failures, so that I can distinguish operation, outcome, severity, and duration while preserving authorization and tenant boundaries.

**Why this priority**: Firebase Functions enforce trusted booking, staff, messaging, and reporting operations, but current logs cover only a few paths.

**Independent Test**: Exercise representative successful and safely forced failing operations using the Firebase Emulator Suite. Verify their records are searchable by function and operation, use an appropriate severity, can be correlated within an execution, and contain no prohibited data.

**Acceptance Scenarios**:

1. **Given** a critical operation succeeds or fails, **When** its execution is reviewed, **Then** a structured record identifies the operation, stage where relevant, outcome, duration where meaningful, and sanitized error category.
2. **Given** an unexpected backend failure occurs, **When** it is logged, **Then** its severity distinguishes it from expected business rejections and the existing callable/HTTP error contract is unchanged.
3. **Given** multiple log records belong to the same request or event execution, **When** an operator investigates them, **Then** platform-provided execution context or a safe opaque correlation identifier can connect them without using customer, staff, appointment, tenant, or credential data as the identifier.
4. **Given** an operator searches logs, **When** they filter by function, severity, operation, outcome, or time, **Then** they can find relevant records through the project's Google Cloud logging tools without querying customer content.

---

### User Story 3 - Protect data in monitoring (Priority: P1)

As a customer, staff member, or business, I want diagnostic reporting to exclude private application data by default, so that receiving support does not expose my information to third-party monitoring or broad log access.

**Why this priority**: The system handles customer contact information, authentication context, appointment details, business records, and WhatsApp messages.

**Independent Test**: Inject representative phone numbers, names, message text, authentication tokens, query parameters, and provider error payloads into test failures. Verify they are removed or rejected before any monitoring transport receives the event or log record.

**Acceptance Scenarios**:

1. **Given** an error is associated with an authenticated or unauthenticated user, **When** it is reported, **Then** no authentication token, password, phone number, name, email, message body, form value, or raw user identity is included.
2. **Given** an error object, request, breadcrumb, or provider response contains sensitive values, **When** it is prepared for reporting, **Then** sensitive values are removed before transmission rather than relying only on later dashboard-side scrubbing.
3. **Given** an operation needs tenant or entity context for diagnosis, **When** context is recorded, **Then** it is minimized, access-controlled, and never used as a substitute for server-side authorization.
4. **Given** monitoring is unavailable or disabled, **When** the application or function continues operating, **Then** monitoring does not block or change booking, authentication, messaging, authorization, or reporting behavior.

---

### User Story 4 - Verify monitoring safely across environments (Priority: P2)

As a maintainer, I want repeatable tests and a controlled verification path for each release, so that I can confirm monitoring works without generating uncontrolled production events or publishing private source code.

**Why this priority**: Observability that cannot be tested safely may silently fail or create cost and noise when enabled.

**Independent Test**: Build each frontend and Functions workspace, run automated redaction/instrumentation tests, then perform a clearly marked smoke test using a non-production monitoring environment or explicit opt-in test mode. Confirm production bundles do not expose source maps or upload credentials.

**Acceptance Scenarios**:

1. **Given** a developer runs local or emulator tests, **When** an error fixture is triggered, **Then** it is testable without sending production events by default.
2. **Given** a staging or production release is prepared, **When** source maps are used to decode errors, **Then** they are available only to authorized monitoring/build systems and are not publicly served with the frontend assets.
3. **Given** an operator performs a smoke test, **When** it runs, **Then** it is explicitly enabled, clearly marked as a test event, and directed to a non-production project or an approved low-volume production test path.
4. **Given** the release is deployed, **When** operators review the runbook, **Then** it explains environment configuration, safe test procedure, log queries, and how to disable or limit reporting.

## Edge Cases

- A React rendering failure occurs during initial client rendering or hydration of a server-rendered public catalog.
- A frontend reports the same failure through both a component boundary and a global event handler.
- A route contains query parameters or a fragment that includes private information.
- A rejected promise represents an expected cancellation, validation response, or handled Firebase error rather than a programming defect.
- A Functions error contains request data, a provider response, or a sensitive value in its message or stack.
- A retried asynchronous notification event produces repeated log records.
- Monitoring configuration is absent, malformed, blocked by an ad blocker, or temporarily unavailable.
- A release is built locally without the restricted source-map upload credential.
- Event volume rises due to a repeated client failure, retry loop, or high-volume expected error.
- A log correlation identifier crosses a synchronous callable and an asynchronous notification worker.

## Requirements

### Functional Requirements

- **FR-001**: The system MUST report unexpected errors from all three frontend applications and distinguish the originating application, environment, and release.
- **FR-002**: Frontend error reporting MUST cover component rendering failures, uncaught browser exceptions, unhandled promise rejections, and safe route/navigation context.
- **FR-003**: Frontend reporting MUST preserve existing user-visible error and recovery behavior and MUST NOT make monitoring availability a dependency for core product flows.
- **FR-004**: Firebase Functions MUST emit structured records for important operation outcomes and unexpected failures, with severity and sanitized context appropriate to the outcome.
- **FR-005**: Backend diagnostic records MUST make critical booking, authorization, messaging/notification, staff/account, reporting, and public-rendering operations distinguishable without duplicating sensitive business payloads.
- **FR-006**: Related records MUST be correlatable using platform execution context or an opaque identifier that is not derived from personal, authentication, tenant, appointment, or message data.
- **FR-007**: Monitoring MUST exclude passwords, tokens, authorization headers, names, phone numbers, emails, message content, form values, raw authentication identities, and unnecessary request/provider payloads before transmission or persistence.
- **FR-008**: Route, exception, and breadcrumb context MUST be minimized; full query strings and fragments MUST NOT be captured by default.
- **FR-009**: Monitoring MUST be configurable by environment. Local development and automated tests MUST NOT send production events by default; production reporting MUST remain disabled until valid production configuration is supplied.
- **FR-010**: Production diagnostic stack traces MUST be usable by authorized operators without making original source code or source-map files publicly retrievable.
- **FR-011**: The implementation MUST provide a safe, documented way to verify reporting in a non-production environment or via an explicitly opted-in test event.
- **FR-012**: Repeated or expected failures MUST be filtered, deduplicated, or otherwise controlled to prevent avoidable event and log volume while retaining actionable failures.
- **FR-013**: Operators MUST be able to investigate backend records using documented filters for time, function, severity, operation, and outcome.
- **FR-014**: Instrumentation MUST NOT weaken tenant isolation, role-based authorization, authentication, booking integrity, data retention, or existing error contracts.

### Testing Requirements

- Unit tests MUST verify frontend initialization by environment, rendering-error capture, global exception/rejection handling, route-context minimization, duplicate suppression, and data redaction before transport.
- Unit tests MUST verify backend severity selection, structured fields, sanitized error context, and opaque correlation behavior without changing callable/HTTP outcomes.
- Integration tests MUST exercise a representative frontend error in each application and representative Functions success/failure paths using existing test and emulator infrastructure.
- Privacy tests MUST include deliberately seeded fake names, phone numbers, emails, messages, credentials, query parameters, and provider payloads and assert that none reach the monitoring transport or structured log output.
- Build/deployment checks MUST verify source-map upload handling and confirm source-map files and upload credentials are absent from publicly deployed assets.
- A non-production smoke test MUST verify each configured frontend and the Functions logging path end to end. It MUST NOT run automatically against production or emit unmarked production test events.
- Existing workspace tests, lint, formatting checks, and builds MUST continue to pass; validation MUST use existing repository scripts and Firebase emulators where applicable.

### Security and Privacy Considerations

- Treat browser telemetry as third-party data disclosure: collect only fields required to diagnose a failure and keep user identification, default PII collection, session replay, and request-body capture disabled.
- Sanitize before network transmission and before writing logs. Dashboard scrubbing is defense in depth, not the primary control.
- Never log passwords, API keys, Firebase ID tokens, cookies, authorization headers, Twilio credentials/signatures, customer contact details, WhatsApp message contents, full form state, or raw provider/webhook payloads.
- Do not use `uid`, tenant ID, appointment ID, phone, slug, or other stable business/user values as correlation IDs. Prefer platform execution IDs or randomly generated opaque identifiers with minimal scope and retention.
- Keep source-map upload credentials in an approved secret manager or CI secret store; never expose them through Vite client variables, source control, build output, or logs. Ensure generated source maps are uploaded privately and excluded from public Hosting assets.
- Restrict monitoring-project and Cloud Logging access by role. Configure retention and event-volume controls according to approved operational/privacy policy.
- Monitoring failures MUST fail open: never block or retry critical user operations solely to deliver diagnostics.

### Proposed Implementation Sequence

1. Agree the safe event/log field contract, severity mapping, redaction rules, environment names, and operational ownership before instrumentation.
2. Add frontend error reporting and route/render context independently to the public client, collaborator, and backoffice applications, preserving their distinct entry points and routing behavior.
3. Extend native structured backend logging to critical Functions paths, then establish safe request/event correlation and documented Cloud Logging queries.
4. Configure release/environment identity, private source-map processing, restricted credentials, environment-specific enablement, and event-volume safeguards.
5. Add unit and emulator integration coverage, validate all four workspaces, perform controlled non-production smoke tests, and document support operations before any production enablement.

## Key Entities

- **Diagnostic event**: A sanitized, environment- and release-tagged frontend failure record with minimal route and application context.
- **Structured operation record**: A severity-tagged backend record describing an operation, stage, outcome, duration, safe error category, and permitted correlation context.
- **Environment and release identity**: Non-secret values that distinguish local/test, staging, and production deployments and their built versions.
- **Correlation identifier**: A platform execution identifier or opaque random value used only to connect related diagnostic records.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A controlled render error, uncaught exception, and unhandled rejection from each frontend can be found in the configured monitoring environment with correct app/environment/release context and no prohibited data.
- **SC-002**: Representative success and unexpected-failure paths for critical Functions operations produce searchable structured records with correct severity, operation/outcome fields, and usable execution correlation.
- **SC-003**: Automated privacy tests demonstrate that 100% of seeded prohibited values are absent from monitoring transport payloads and structured logs.
- **SC-004**: A production frontend build has usable private diagnostic source mapping for authorized operators while no source-map files or upload credentials are publicly retrievable.
- **SC-005**: A maintainer can complete the documented non-production verification without generating production events, and a monitoring outage does not alter a user-facing or backend business outcome.
- **SC-006**: Existing tests, lint, formatting, and builds pass for the affected workspaces before production enablement.

## Assumptions

- The three frontend workspaces remain independently configured and deployed; their common React/Vite stack does not imply identical initialization or routing wiring.
- Frontend errors will use Sentry as requested, subject to a configured Sentry organization/project and privacy review.
- Firebase Functions v2 native structured logging to Google Cloud Logging is sufficient for the initial backend scope; backend Sentry is deferred unless a concrete operational requirement cannot be met with platform logs.
- A staging Firebase/Sentry environment is not confirmed by this review. If none exists, external setup or an approved isolated test project is required before end-to-end smoke testing.
- Existing performance measurements in `specs/005-booking-request-performance/` remain authoritative for booking latency; this feature reuses or complements them without creating duplicate performance instrumentation.
- Exact retention periods, alert thresholds, project ownership, and any consent/legal requirements must be confirmed during planning with the system owner; this specification does not invent them.
- No application behavior, production Firebase state, or deployment configuration is changed until this specification and its subsequent plan are approved.
