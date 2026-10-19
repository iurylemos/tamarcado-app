# Tasks: Operational Readiness and Reliability

**Input**: `specs/009-operational-readiness-reliability/spec.md` and `audit.md` (2026-10-17)

**Scope note**: This task list plans the remaining operational gaps. It does not claim production access or validation, and it does not duplicate Spec 008's telemetry implementation. `plan.md` was not requested and is intentionally not created.

**Format**: `- [ ] Tnnn [P?] [USn?] Action and target artifact/system`

## Phase 1: Setup and Evidence Baseline

**Purpose**: Convert static audit findings into evidence-backed work items without treating unknown production state as fact.

- [ ] T001 Create an operational evidence register with finding, priority, evidence source, verification date, owner, status, and next action in `specs/009-operational-readiness-reliability/evidence-register.md`
- [ ] T002 Identify the system owner and authorized contacts for Firebase/Google Cloud, Sentry, Hosting, release operations, and incident response; record unavailable access explicitly in `specs/009-operational-readiness-reliability/evidence-register.md`
- [ ] T003 Verify account, deployment, billing, quota, Sentry, Hosting artifact, domain/TLS, and current release-process facts against their source systems; attach evidence and date each claim in `specs/009-operational-readiness-reliability/evidence-register.md`

**Checkpoint**: Unknown or inaccessible production state remains explicitly unverified; no target or remediation is based solely on static assumptions.

## Phase 2: User Story 1 - Release with reliable delivery controls (Priority: P1)

**Goal**: Establish repeatable validation, secure release promotion, and a tested recovery path.

**Independent Test**: A non-production release is blocked by an intentionally failing check, a valid release reaches the approved environment, and the prior release is restored using the documented procedure.

- [ ] T004 [US1] Discover the actual release owner, current Hosting/Functions release path, required approvals, and rollback capabilities; record the agreed flow in `docs/operations/release-process.md`
- [ ] T005 [US1] Add an automated validation workflow in `.github/workflows/validation.yml` that runs the existing relevant test, lint, format-check, and build scripts before release
- [ ] T006 [US1] Define dependency and secret scanning gates, exception ownership, and failure behavior in `.github/workflows/validation.yml` and `docs/operations/release-process.md`
- [ ] T007 [US1] Add environment promotion, required approval, least-privilege release credentials, and rollback steps to `.github/workflows/release.yml` and `docs/operations/release-process.md`; use the authorized secret mechanism and do not expose secrets in client builds or logs
- [ ] T008 [US1] Connect Spec 008's private source-map upload and release identity requirements to the approved release workflow without adding a second pipeline; update `specs/008-observability-and-logs/tasks.md` and `docs/operations/release-process.md`
- [ ] T009 [US1] Run a controlled staging release with a failing validation case, a successful promotion, and a rollback; record evidence and corrective actions in `docs/operations/release-validation.md`

**Checkpoint**: No production promotion occurs until the required gates, secret handling, approvals, and rollback path have been verified in a non-production environment.

## Phase 3: User Story 2 - Detect and manage operational incidents (Priority: P1)

**Goal**: Define measurable service objectives and an actionable, practiced incident response process.

**Independent Test**: Each critical flow has an owner, approved indicator and objective (or an approved reason it remains undefined), alert path, and response procedure; one controlled exercise records results and follow-up owners.

- [ ] T010 [US2] Identify critical customer/staff flows, service owners, and impact tiers; record them in `docs/operations/service-ownership.md`
- [ ] T011 [US2] Define each flow's SLI, data source, evaluation window, target, error budget, and owner-approved alert action in `docs/operations/slo.md`; evaluate the Spec 005 booking target as a candidate, not as an existing operational SLO
- [ ] T012 [US2] Configure alert policies and routing for approved objectives in the existing platform monitoring system, and document thresholds, recipients, and escalation in `docs/operations/alerting.md`
- [ ] T013 [US2] Define incident severity, responder roles, escalation, customer/staff communications, mitigation, recovery, and post-incident review in `docs/operations/incident-response.md`
- [ ] T014 [US2] Create response runbooks for the approved high-impact alerts in `docs/operations/runbooks/`, including safe verification and rollback steps
- [ ] T015 [US2] Run a controlled incident/tabletop exercise using one critical-flow failure scenario; record detection, response timing, gaps, and assigned follow-ups in `docs/operations/exercises/`

**Checkpoint**: Production alerting and incident objectives have named owners and are supported by an exercised response path.

## Phase 4: User Story 3 - Understand capacity, spend, and recovery risk (Priority: P2)

**Goal**: Verify cost, quota, dependencies, and recoverability, then approve targets and controls based on evidence.

**Independent Test**: Account evidence supports the cost/quota inventory; critical dependencies have a recovery profile; a controlled recovery exercise records actual outcomes against approved RTO/RPO or marks them unverified.

- [ ] T016 [US3] Record Firebase/Google Cloud and Sentry plan, usage, event/log volume, retention, quotas, and budget state from account evidence in `docs/operations/capacity-cost.md`
- [ ] T017 [US3] Set owner-approved budget and quota alerts in the relevant cloud/monitoring accounts and document thresholds, recipients, and response steps in `docs/operations/capacity-cost.md`
- [ ] T018 [US3] Inventory critical services and external dependencies, including owner, region, criticality, and verified evidence, in `docs/operations/dependency-inventory.md`
- [ ] T019 [US3] Agree recovery objectives and backup/restore expectations with system owners; record RTO/RPO decisions and unverified items in `docs/operations/recovery.md`
- [ ] T020 [US3] Review asynchronous notification retries, idempotency, duplicate side effects, failure visibility, and dead-letter options; document the approved behavior and any implementation follow-up in `docs/operations/async-recovery.md`
- [ ] T021 [US3] Exercise the approved restore/recovery procedure in a controlled environment and record actual results, deviations, and owners in `docs/operations/recovery-exercises/`
- [ ] T022 [US3] Evaluate regional recovery options against verified data location, consistency, customer impact, cost, and operational complexity; record a decision and rationale in `docs/operations/regional-resilience.md` before proposing topology changes

**Checkpoint**: No multi-region, backup, dead-letter, or cost threshold decision is presented as complete without owner approval and evidence.

## Phase 5: User Story 4 - Make public-interface and operational-surface decisions (Priority: P3)

**Goal**: Reconcile public interfaces and deployed TLS/domain state, and approve only operational additions with identified users.

**Independent Test**: Repository and deployed endpoint inventories reconcile, TLS/domain evidence is recorded, and contract/health/dashboard decisions identify consumers and operational outcomes.

- [ ] T023 [P] [US4] Inventory callable, HTTP, webhook, and public-rendering interfaces with owner, consumer, authentication boundary, contract source, and deployment endpoint in `docs/operations/interface-inventory.md`
- [ ] T024 [P] [US4] Verify deployed domains, certificates, renewal ownership, and applicable TLS policy; record evidence in `docs/operations/domain-tls-inventory.md`
- [ ] T025 [US4] Assess contract documentation and validation needs against verified consumers; record whether OpenAPI or another contract check is justified in `docs/operations/interface-contracts.md`
- [ ] T026 [P] [US4] Ask the named operational consumers whether health/readiness checks or a dashboard are needed; record the decision, owner, signal, and action path in `docs/operations/health-dashboard-decision.md`
- [ ] T027 [US4] Record an explicit no-go decision for API Gateway or a separate production metrics stack unless a verified requirement, consumer, and owner justify them in `docs/operations/architecture-decisions.md`

**Checkpoint**: No new public endpoint, gateway, dashboard, or metrics infrastructure is added without an approved consumer and measurable operational outcome.

## Phase 6: Polish and Cross-Spec Readiness

- [ ] T028 Reconcile completed evidence, residual risks, owners, and dependencies between `specs/008-observability-and-logs/tasks.md`, `specs/009-operational-readiness-reliability/tasks.md`, and `specs/009-operational-readiness-reliability/evidence-register.md`
- [ ] T029 Obtain system-owner review of unresolved high-priority risks and record explicit acceptance, mitigation, or release-blocking status in `docs/operations/readiness-review.md`

## Dependencies

```text
T001 -> T002 -> T003
T003 -> T004 -> T005 -> T006 -> T007 -> T008 -> T009
T003 -> T010 -> T011 -> T012 -> T013 -> T014 -> T015
T003 -> T016 -> T017
T003 -> T018 -> T019 -> T020 -> T021 -> T022
T003 -> T023 -> T024 -> T025
T003 -> T026 -> T027
T009, T015, T022, T025, T027 -> T028 -> T029
```

## Parallel Opportunities

- After T003, User Stories 1, 2, 3, and 4 can progress independently, subject to the named system owners and external access.
- In User Story 4, T023, T024, and T026 can run in parallel because they produce separate inventories/decisions.
- Within User Story 3, T016 and T018 can proceed in parallel after the evidence baseline; recovery target decisions depend on the dependency inventory.

## Implementation Strategy

1. Complete the evidence baseline before selecting targets or changing production configuration.
2. Prioritize the P1 release and incident controls; validate both in non-production.
3. Establish P2 cost, quota, and recovery decisions from verified system state.
4. Complete P3 interface and operational-surface decisions without adding infrastructure absent a demonstrated need.
5. Close with an owner-reviewed readiness record and explicit disposition of all high-priority residual risks.
