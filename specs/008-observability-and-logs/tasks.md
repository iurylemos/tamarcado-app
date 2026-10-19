# Implementation Tasks: Observability and Logs

**Branch**: `008-observability-and-logs` (planned; not created) | **Updated**: 2026-10-18 | **Spec**: `specs/008-observability-and-logs/spec.md` | **Plan**: `specs/008-observability-and-logs/plan.md`

**Audit baseline**: `audit.md` (2026-10-17). A checked subtask means the repository evidence is present; it does not prove deployed configuration, production delivery, or account-level settings. Do not mark externally verifiable work complete without production/staging evidence.

---

## Task Breakdown

### Phase 1: Frontend Error Monitoring (Sentry)

#### T001 — Add Sentry dependencies to each frontend workspace
- [x] `@sentry/react` is already declared for the three frontend applications
- [x] `@sentry/vite-plugin` is already declared as a build-time dependency
- [ ] Verify compatibility with React 19 / Vite 8
- [ ] Run `npm install` in all workspaces

#### T002 — Create monitoring initializer modules
- [x] Sentry initialization is present in `client`, `collaborator`, and `backoffice`
- [x] DSN and environment configuration are present for all three applications
- [ ] Normalize release identity between build artifacts and frontend events; `collaborator` does not set an event release and build/event defaults are not uniform
- [ ] Verify a consistent privacy-first configuration across all applications; replay and tracing are currently enabled in `collaborator` and `backoffice`

#### T003 — Implement safe route context breadcrumbs
- [x] Route breadcrumbs/context are present in all three applications
- [x] `client` restricts route context and sanitizes telemetry
- [ ] Verify that `collaborator` and `backoffice` route context excludes query strings, fragments, and unsafe route data
- [ ] Review the existing tracing configuration against the approved scope; tracing is enabled in all three applications and sampled at 100% in `collaborator` and `backoffice`

#### T004 — Implement beforeSend/breadcrumb sanitization policy
- [x] `client` has explicit event/span/breadcrumb sanitization and disables user-data collection
- [ ] Add equivalent pre-transmission sanitization to `collaborator` and `backoffice`; the audit found no equivalent `beforeSend` policy
- [ ] Verify safe handling of exception messages, request/auth context, breadcrumbs, and stack frames in all applications
- [ ] Verify duplicate suppression across all applications; current route breadcrumb deduplication in two applications does not establish error-event deduplication

#### T005 — Wrap rendered trees with Sentry Error Boundary
- [ ] Wrap `client/src/main.tsx` root with Sentry Error Boundary (preserve existing fallback)
- [ ] Wrap collaborator root with Sentry Error Boundary
- [ ] Wrap backoffice root with Sentry Error Boundary
- [ ] Ensure existing user-facing error behavior unchanged

#### T006 — Configure Sentry Vite plugin for private source maps
- [x] Sentry Vite plugin configuration is present in all three frontend builds
- [x] Production builds conditionally generate hidden source maps, upload them when a token is supplied, and remove maps after upload
- [ ] Fail closed when upload is unsuccessful or any public `*.map` remains; `collaborator` and `backoffice` can currently generate public maps when no token is supplied
- [ ] Use `SENTRY_AUTH_TOKEN` server-side only (never in `VITE_` vars, `.env.example`, source control, or bundles)
- [ ] Configure org/project as non-secret build settings

#### T007 — Frontend unit tests (Vitest/jsdom per workspace)
- [ ] `client/src/monitoring/__tests__/init.test.tsx` — initialization by environment, render-error capture, uncaught exception, unhandled rejection, route-context minimization, duplicate suppression, data redaction
- [ ] `collaborator/src/monitoring/__tests__/init.test.tsx` — same test suite
- [ ] `backoffice/src/monitoring/__tests__/init.test.tsx` — same test suite
- [ ] Use SDK test transport/mocks (no network calls to Sentry)
- [ ] Privacy tests: seed fake names, phone/email, message text, token/header, query, provider payload → assert none reach transport
- [ ] Assert expected/handled errors not reported as unhandled

#### T008 — Frontend build verification
- [ ] Build each frontend (`npm run build --workspace client|collaborator|backoffice`)
- [ ] Assert final Hosting assets (`dist/`) have no `.map` files
- [ ] Assert no upload-token sentinel in build output
- [ ] Run staging smoke event (explicit opt-in) to verify remote capture + source-map resolution
- [ ] Never target production for smoke test

---

### Phase 2: Backend Structured Logging (Firebase Functions)

#### T009 — Add correlation ID to notification job model
- [ ] Update `functions/src/model/appointment-notification-job.model.ts`
- [ ] Add `correlationId: string` field (random server-generated UUID)
- [ ] Ensure field persists in server-only job document
- [ ] No Firestore rule changes (collection covered by default deny `firestore.rules:67-69`)

#### T010 — Create diagnostic logging helper (if justified by shared call sites)
- [ ] Create `functions/src/services/diagnostic-logging.service.ts` (only if tests show repeated sanitization logic)
- [ ] Emit allowlisted fields: function/operation, stage, outcome, duration (uncovered ops only), safe error category/code, opaque correlationId
- [ ] Sanitization: NO raw Error objects, free-form exception/provider messages, request bodies, headers, Twilio signatures/payloads, user IDs, tenant IDs, appointment IDs, customer contact data, message contents
- [ ] Do NOT log routine validation/authorization rejections as unexpected errors
- [ ] Log once at owning Functions boundary
- [ ] Pass existing `HttpsError` responses through unchanged
- [ ] Verify current `HttpsError` messages are static/safe
- [ ] For unexpected failures: log allowlisted metadata, return/rethrow existing generic internal response
- [ ] For notification trigger: use safe retry sentinel to retain platform retry behavior

#### T011 — Integrate correlation ID in booking flow
- [ ] Update `functions/src/services/booking.service.ts`:
  - Generate random server-side UUID at booking creation
  - Persist on server-only notification job document
  - Add to existing backend booking timing records (feature 005 records)
- [ ] Update `functions/src/services/appointment-notification.service.ts` worker:
  - Log the correlationId from job document
  - Do NOT create separate timing event
  - Do NOT use appointment/job/tenant/customer identifiers as log correlation
- [ ] Keep correlation field out of browser performance logs and user-facing responses

#### T012 — Functions unit tests (Vitest)
- [x] Existing `booking.performance` metrics and tests from feature 005 are the baseline; do not add duplicate timing events for the covered paths
- [ ] Test logging helper (if created) with spies on Firebase logger:
  - Structured fields, severity, allowed error category, exact redaction, logger failure not changing operation behavior
  - If duration added to uncovered operation: assert presence/type there; assert NO new duration record for feature-005-covered paths
- [ ] Test representative callable/HTTP boundaries:
  - Expected `HttpsError`/validation outcomes NOT promoted to unexpected error events
  - Injected unexpected error → one sanitized record + preserves public error response/status
  - Provider rejection + worker retry behavior without logging raw provider payloads
- [ ] Extend `functions/src/functions/appointments/create-public-appointment.spec.ts` and service tests:
  - Verify random correlation value persisted in job
  - Verify appears in existing backend timing records + worker record
  - Verify not derived from business identifiers
  - Verify adds no duration event
  - Assert customer/tenant data absent from emitted log fields
- [ ] Use existing emulator-backed authorization/tenant isolation tests
- [ ] Do NOT weaken or edit `firestore.rules`

---

### Phase 3: Release Configuration & Operational Validation

#### T013 — Environment configuration
- [ ] Document required: Sentry organization with 3 frontend projects/DSNs, non-production environment
- [ ] Document restricted source-map upload token (release process only)
- [ ] Document environment/release naming conventions
- [ ] Document authorized Sentry and Cloud Logging access
- [ ] Document isolated Firebase staging/emulator verification path
- [ ] `VITE_SENTRY_DSN`, `VITE_SENTRY_ENVIRONMENT`, `VITE_SENTRY_RELEASE` = browser build config (not secrets)
- [ ] `SENTRY_AUTH_TOKEN` = secret, NOT in `.env.example`, NOT in client-prefixed vars, NOT in source control, NOT in bundles
- [ ] Functions: no monitoring secret or new Sentry env var needed

#### T014 — CI/CD release process integration
- [ ] Integrate the private source-map upload and release identity requirements with the approved release workflow defined by Spec 009; no automated workflow is present in the audit baseline
- [ ] Supply `SENTRY_AUTH_TOKEN` through the approved restricted secret mechanism
- [ ] Configure and verify staging/release secrets before enabling any production guard
- [ ] Ensure a failed upload cannot silently publish source maps or claim symbolicated diagnostics

#### T015 — Repository validation commands
- [ ] Run `npm test` — all workspace tests pass
- [ ] Run `npm run test:emulator` — Functions emulator tests pass
- [ ] Run `npm run lint` — no lint errors
- [ ] Run `npm run format:check` — formatting correct
- [ ] Run `npm run build` — all workspaces build
- [ ] Run `npm run build:hosting` — client/collaborator/backoffice build for Hosting

#### T016 — Operational validation (non-production)
- [ ] Verify one explicitly marked event from each frontend in staging Sentry
- [ ] Verify one representative Functions structured record in Cloud Logging
- [ ] Verify Logs Explorer filtering by time, severity, function/resource, `jsonPayload.operation`, `labels.execution_id`
- [ ] Verify correlation across booking + worker via opaque `correlationId`
- [ ] Verify source-map symbolication works in staging
- [ ] Confirm NO production events generated
- [ ] Check event/log volume and retry behavior in staging
- [ ] Set thresholds, retention, alerting with system owner before production enablement

---

### Phase 4: Documentation & Runbook

#### T017 — Document Logs Explorer queries
- [ ] Document queries over time, severity, function/resource, `jsonPayload.operation`, `labels.execution_id`
- [ ] Document using opaque `correlationId` only to join booking and worker records
- [ ] Document access restriction and retention/alert budgets per system owner policy

#### T018 — Document monitoring runbook
- [ ] Environment configuration reference
- [ ] Safe test procedure (non-production)
- [ ] Log query patterns
- [ ] How to disable or limit reporting
- [ ] Rollback procedure

---

## Dependencies

```
T001 → T002 → T003 → T004 → T005 → T006 → T007 → T008
                                    ↘
T009 → T010 → T011 → T012
                                    ↘
T013 → T014 → T015 → T016 → T017 → T018
```

**Cross-spec dependency**: T014 depends on the approved release workflow and restricted credential path established by Spec 009 (tasks T004-T007). T008 remains responsible for the source-map artifact safety checks; T016 remains responsible for non-production telemetry verification.

## Acceptance Criteria (from plan.md Review Criteria)

1. **No duplicate performance instrumentation** — Regression tests assert covered event counts, operation/stage values, duration semantics remain intact
2. **Private source maps** — Staging stack trace resolves; all three public build dirs lack `.map` files and upload credential
3. **Verifiable tests** — Each frontend has controlled render-error, uncaught-exception, rejected-promise capture test; privacy tests assert sensitive values absent; build asserts no `.map` files; staging smoke verifies remote capture + source-map resolution
4. **Backend sink** — Only Firebase/Google Cloud structured logging for Functions; no Sentry Functions dependency
5. **Architecture preservation** — Instrumentation in responsible workspaces; no changes to tenant/role checks, Firestore/Storage rules, booking integrity, user-visible errors, Hosting sites/rewrites, Functions region/runtime, deploy commands; emulator security tests pass

---

## Risk Mitigation

- **Privacy/noise**: Default console/network breadcrumbs, raw exception messages, provider errors, high-volume expected failures, retries → allowlisted fields, one logging boundary, deduplication, non-production smoke tests
- **Correlation field**: Persisted with notification job for job's lifecycle; grants no access; verify existing rules deny client reads/writes; never copied to public responses
- **Release credential**: Missing/misconfigured token blocks monitored production build → configure staging/release secrets first; failed upload must not silently publish maps
- **Audit boundary**: The audit verifies repository configuration only. Sentry/GCP accounts, deployed Hosting artifacts, billing, quotas, alerting, and production behavior remain unverified until explicit external validation is recorded.
- **No production changes**: No production Firebase state, deployment, seed/import, or real monitoring events changed during implementation