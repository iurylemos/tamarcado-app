# Feature Specification: Operational Readiness and Reliability

**Feature Branch**: Not created; feature identifier `009-operational-readiness-reliability`

**Created**: 2026-10-18

**Status**: Draft — Review Required

**Input**: Close the operational-readiness gaps identified in [`audit.md`](../../audit.md), prioritizing the highest risks while avoiding duplication of the frontend/backend telemetry scope in Spec 008.

## Objective

Give the Tamarcado team verifiable release controls, operational objectives, incident procedures, and evidence about cost, capacity, resilience, and public interfaces. Decisions that depend on production accounts or system owners must be based on recorded evidence, not assumptions from repository configuration.

This specification covers the gaps that remain outside Spec 008. It does not replace or duplicate Spec 008's frontend error reporting, telemetry privacy, source-map handling, backend diagnostic logging, or monitoring runbook work.

## Audit Findings and Priority

The source of the initial findings is the static repository audit dated 2026-10-17. Production systems, provider consoles, billing, and deployed artifacts were not inspected; findings below preserve that distinction.

| Priority | Gap or risk | Spec ownership |
| --- | --- | --- |
| High | Sentry privacy/sampling differs between frontends; release identity is inconsistent; source maps may be publicly served by two Hosting builds without an upload token. | Spec 008: close through implementation and non-production verification before enabling production telemetry. |
| High | No versioned CI/CD workflow is evidenced for validation, security checks, release promotion, or rollback. | Spec 009, User Story 1. |
| High | Operational SLOs, alerting, incident severity, runbooks, and recovery exercises are not evidenced. The booking target in Spec 005 is not an instrumented operational SLO. | Spec 009, User Story 2. |
| Medium | Actual billing plan, event/log volumes, quotas, budgets, backups, and recovery capabilities are unknown. | Spec 009, User Story 3; validate externally before setting targets. |
| Medium | Functions are configured for one region; deployed data-region and failover/recovery behavior are unknown. | Spec 009, User Story 3; evaluate options before choosing multi-region changes. |
| Medium | API/interface inventory, contract validation, deployed domains, and TLS configuration are incomplete or unverified. | Spec 009, User Story 4. |
| Low / decision | Health/readiness endpoints and an SRE dashboard are absent; their consumers and operational value have not been established. | Spec 009, User Story 4; make a documented decision before adding them. |

## Scope Boundary and Dependencies

- Spec 008 owns application telemetry: Sentry configuration/privacy/release identity/source maps, Firebase structured diagnostic logs, safe correlation, and its controlled verification/runbook.
- Spec 009 owns CI/CD foundations and the broader operational practices, external-state verification, capacity/recovery decisions, and interface inventory listed above.
- Spec 009's release workflow must provide the approved mechanism for Spec 008's restricted source-map upload; Spec 008 does not independently create a second release pipeline.
- Preserve existing authorization, tenant isolation, Firestore/Storage rules, booking integrity, callable/HTTP behavior, and deployment targets unless a separately approved requirement demonstrates a need to change them.
- Do not assume a particular Firebase billing plan, Sentry plan, quota, SLO target, RTO/RPO, or multi-region design. Obtain owner approval and evidence before recording these as operational policy.
- Do not introduce an API Gateway or a production Prometheus/Grafana stack without a demonstrated consumer or requirement; prefer existing platform capabilities when they meet the approved need.

## User Scenarios & Testing

### User Story 1 - Release with reliable delivery controls (Priority: P1)

As a maintainer, I want changes to pass consistent automated checks and move through controlled environments with a recoverable release path, so that preventable defects and exposed credentials or artifacts do not reach customers.

**Why this priority**: The audit found no versioned CI/CD workflow, and the release path is also needed to safely operationalize Spec 008's private source-map requirements.

**Independent Test**: Exercise a non-production release from validation through promotion and rollback. Verify required checks block a failing change, credentials are not exposed, and the prior release can be restored using the documented procedure.

**Acceptance Scenarios**:

1. **Given** a proposed change, **When** the automated validation workflow runs, **Then** the existing relevant tests, lint, formatting, and builds are checked before release.
2. **Given** a dependency or secret finding violates the approved release policy, **When** the release gate evaluates it, **Then** the release is blocked or an explicitly authorized exception is recorded.
3. **Given** a release is promoted, **When** an operator reviews its record, **Then** the change, environment, approval, validation result, and recovery path are identifiable.
4. **Given** a staging release fails its health or acceptance checks, **When** the rollback procedure is exercised, **Then** the prior known-good release is restored without changing business data or access controls.

---

### User Story 2 - Detect and manage operational incidents (Priority: P1)

As an operator, I want approved service objectives, actionable alerts, clear incident roles, and practiced runbooks, so that customer-impacting failures are detected and handled consistently.

**Why this priority**: The audit found no evidence of operational SLOs, alert policies, incident severity, runbooks, or recovery exercises.

**Independent Test**: Review each critical user flow's owner, service indicator, approved objective, alert route, and response procedure; then perform a controlled exercise and record whether responders can detect, mitigate, and communicate the event.

**Acceptance Scenarios**:

1. **Given** a critical user flow is declared in scope, **When** its operational objective is reviewed, **Then** the indicator, data source, evaluation window, target, owner, and alert action are approved and documented.
2. **Given** an alert signals customer impact, **When** the on-call responder follows the incident process, **Then** severity, escalation, communications, mitigation, and recovery responsibilities are explicit.
3. **Given** a runbook is used in a controlled exercise, **When** the exercise concludes, **Then** gaps, owners, and corrective actions are recorded.
4. **Given** the existing Spec 005 booking performance target is considered, **When** an operational SLO is proposed, **Then** the target is not treated as a measured SLO until its source, window, error budget, and alert policy are approved and verifiable.

---

### User Story 3 - Understand capacity, spend, and recovery risk (Priority: P2)

As a system owner, I want verified billing, quota, volume, dependency, backup, and recovery information, so that cost and regional failure risks can be managed before they disrupt service.

**Why this priority**: These conditions are not verifiable from the repository, while the backend is configured for a single region and the monitoring sampling can affect volume and spend.

**Independent Test**: Compare the recorded inventory with the Firebase/Google Cloud and Sentry account settings; verify that approved budget/quota alerts exist and that a recovery exercise demonstrates the documented restoration target.

**Acceptance Scenarios**:

1. **Given** a production dependency or monitoring service is in scope, **When** its operational record is reviewed, **Then** the verified plan, owner, region, quota, usage, retention, and evidence date are recorded or explicitly marked unavailable.
2. **Given** a cost or quota threshold is approved, **When** usage approaches that threshold, **Then** the alert reaches the named owner before a service limit or budget is exceeded.
3. **Given** a critical data or compute dependency fails, **When** its recovery plan is exercised, **Then** actual recovery behavior is compared with approved RTO/RPO and unresolved gaps are assigned.
4. **Given** regional failover or a dead-letter strategy is considered, **When** the options are evaluated, **Then** the decision accounts for consistency, idempotency, cost, operational complexity, and business impact rather than assuming a multi-region design is required.

---

### User Story 4 - Make public-interface and operational-surface decisions (Priority: P3)

As a maintainer, I want an accurate inventory of public interfaces, TLS/domain state, and operational health consumers, so that contracts and additional endpoints or dashboards are added only when they solve a verified need.

**Why this priority**: The audit found incomplete contract/TLS documentation, but no demonstrated external API consumer or health/dashboard requirement.

**Independent Test**: Reconcile repository interface definitions with deployed endpoints and domains, verify certificate/TLS evidence, and review signed decisions for contract checks, health checks, and dashboard ownership.

**Acceptance Scenarios**:

1. **Given** a public or provider-facing interface is identified, **When** its inventory entry is reviewed, **Then** its owner, consumers, authentication boundary, contract source, and deployment endpoint are recorded.
2. **Given** a custom domain or TLS endpoint is in production, **When** it is validated, **Then** certificate status, renewal responsibility, and relevant TLS policy are supported by deployment evidence.
3. **Given** OpenAPI/contract validation, a health endpoint, or an SRE dashboard is proposed, **When** its need is reviewed, **Then** the consumer and operational outcome are documented before implementation is approved.
4. **Given** no API Gateway or separate metrics stack is justified by an identified requirement, **When** the decision is recorded, **Then** those components remain out of scope.

## Edge Cases

- Production console access is unavailable or an account's plan, quota, alert, or deployment state cannot be verified.
- A staging or production release lacks a required secret or an upload/check fails midway.
- Existing deployment workflows differ from repository scripts or are managed outside the repository.
- A service objective lacks an owner, reliable data source, or meaningful measurement window.
- A dependency's actual region, backup policy, or recovery behavior differs from static configuration.
- Retried notification work creates duplicate side effects or repeated operational load.
- A domain, certificate, external consumer, or endpoint exists outside the repository inventory.
- A requested health endpoint or dashboard has no named consumer or actionable alert path.

## Requirements

### Functional Requirements

- **FR-001**: The release process MUST record evidence separately from assumptions and MUST identify the source and verification date for account, deployment, billing, quota, and domain facts.
- **FR-002**: The release process MUST execute the repository's approved validation checks before promotion and MUST expose failed checks as a release blocker unless an authorized, documented exception exists.
- **FR-003**: Release credentials MUST be restricted to the required job and permissions; they MUST NOT be exposed in browser bundles, source control, public artifacts, or logs.
- **FR-004**: A production promotion MUST have an identifiable approver, release record, and documented rollback path.
- **FR-005**: Each critical user flow MUST have a named owner and an approved operational indicator, objective, data source, evaluation window, and response action before it is represented as an SLO.
- **FR-006**: Incident procedures MUST define severity, escalation, communications, ownership, mitigation, recovery, and post-incident follow-up.
- **FR-007**: Runbooks and recovery procedures MUST be exercised in a controlled environment, with outcomes and follow-up owners recorded.
- **FR-008**: Billing, quota, monitoring volume, retention, and budget-alert state MUST be verified with account evidence; unknown values MUST remain explicitly unknown.
- **FR-009**: Critical dependencies MUST have a verified region, owner, backup/recovery posture, and an approved RTO/RPO or a recorded decision that these targets remain undefined.
- **FR-010**: Retry, redelivery, and dead-letter decisions for asynchronous operations MUST account for idempotency, duplicate side effects, customer impact, and platform retry behavior.
- **FR-011**: Public and provider-facing interfaces MUST have an inventory entry for owner, consumer, contract source, authentication boundary, endpoint, and deployment evidence.
- **FR-012**: TLS/domain verification MUST use deployed evidence and identify certificate ownership and renewal responsibility.
- **FR-013**: OpenAPI/contract tooling, health/readiness endpoints, dashboards, API Gateway, and separate metrics stacks MUST require a documented consumer or operational need before approval.
- **FR-014**: Spec 009 MUST NOT duplicate Spec 008's telemetry implementation tasks or weaken privacy, authorization, tenant isolation, booking integrity, existing public contracts, or monitoring fail-open behavior.

### Verification Requirements

- The release workflow MUST be verified with at least one intentionally failing validation and one controlled non-production promotion/rollback.
- SLO and incident readiness MUST be assessed through documented owner review and at least one controlled response exercise.
- Account-level cost, quota, Sentry, GCP/Firebase, Hosting, and TLS claims MUST cite evidence that is not inferable from repository files alone.
- Recovery and retry claims MUST be validated against a controlled exercise or explicitly remain an unverified risk.
- No production deployment, real production smoke event, or production configuration change is part of specification/task authoring.

## Key Entities

- **Operational evidence record**: A claim about account, deployment, security, cost, quota, domain, or recovery state, with source, owner, verification date, and confidence.
- **Release record**: A traceable change, validation result, approval, environment, and rollback reference.
- **Service objective**: An approved indicator, target, source, evaluation window, owner, and alert/response action for a critical user flow.
- **Incident record**: A severity, impact, timeline, responders, mitigations, communications, recovery result, and follow-up actions.
- **Dependency recovery profile**: A dependency's owner, region, criticality, backup/failover strategy, and verified recovery outcome.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Every critical production flow and dependency in scope has a named owner and a verified or explicitly unknown operational evidence record.
- **SC-002**: Every production release path passes its required validation gates and records an approver; rollback has been successfully exercised for each release path.
- **SC-003**: Every critical flow has an approved, measurable operational objective and alert path, or a documented owner-approved reason it remains undefined.
- **SC-004**: Every critical dependency has documented recovery expectations and at least one recorded exercise or a clearly identified untested recovery risk.
- **SC-005**: All cost, quota, account-plan, domain, TLS, and monitoring-volume statements are traceable to dated external evidence or remain marked unverified.
- **SC-006**: Every proposed API/health/dashboard addition has a named consumer and an approved operational outcome before implementation begins.

## Assumptions

- The audit is a static snapshot, not proof of deployed or account-level state.
- The business/system owner will identify critical user flows, operational owners, acceptable service targets, budgets, and recovery expectations.
- Existing Firebase, Google Cloud, and Sentry capabilities are evaluated before introducing additional infrastructure.
- The project may have an externally managed release process not represented in the repository; discovery precedes workflow design.
- Spec 008 is the source of truth for frontend and backend diagnostic telemetry; its high-priority gaps remain tracked there.
