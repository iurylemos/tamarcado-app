# Implementation Plan: Observability and Logs

**Branch**: `008-observability-and-logs` (planned; not created) | **Date**: 2026-10-14 | **Spec**: `specs/008-observability-and-logs/spec.md`

**Input**: User-approved specification for planning: `specs/008-observability-and-logs/spec.md`.

**Artifact boundary**: This approval stage creates only `plan.md`. The repository's planning research, design, data notes, and runnable validation design are recorded inline below. No `research.md`, `data-model.md`, `quickstart.md`, `contracts/`, `tasks.md`, or application code is created in this stage. There is no new public API contract.

## Summary

Add error monitoring to each of the three independently bootstrapped React/Vite frontends using `@sentry/react`, with safe route context and private release source maps. Keep Firebase Functions on the existing `firebase-functions` logger and Google Cloud Logging; do not add Sentry to Functions. Preserve the existing Firebase Hosting sites, rewrites, Functions behavior, and tenant/role authorization.

Booking latency instrumentation is already implemented by feature 005 in both client services and Functions services. Feature 008 will add no duplicate timing measurements for those covered booking, availability, or notification operations and will not add frontend tracing/APM. A duration field may be added to a different critical Functions operation only when no existing measurement covers it and it has clear operational value. Where a backend booking log must be connected to its deferred notification worker, add only a server-generated opaque correlation ID to the existing backend records and server-only notification-job document.

## Technical Context

**Language/Version**: TypeScript 6; React 19; Firebase Functions Node.js 24.

**Primary Dependencies**: Existing Vite 8, React Router 7, Firebase Functions v2 SDK `firebase-functions@^7.4.0`, Firebase CLI `^15.32.1`, and Vitest 5. Add `@sentry/react` to each frontend workspace and `@sentry/vite-plugin` as a root build-time dependency after checking their current compatibility with React 19/Vite 8. Do not add a Functions monitoring SDK.

**Storage**: No new collection or client-visible data. Add a random server-generated `correlationId` to the existing `AppointmentNotificationJobDocument` so the booking and asynchronous worker records can be joined; that collection is covered by the default deny rule in `firestore.rules:67-69`. No rule change is planned.

**Testing**: Existing Vitest/jsdom frontend suites; Functions Vitest unit tests and Firebase Emulator Suite. Existing validation commands are `npm test`, `npm run test:emulator`, `npm run lint`, `npm run format:check`, `npm run build`, and `npm run build:hosting` (`package.json:11-31`).

**Target Platform**: Three Firebase Hosting sites plus Firebase Functions v2/Google Cloud Logging; non-production Sentry project(s) for safe smoke tests.

**Project Type**: npm monorepo with `client`, `collaborator`, `backoffice`, `functions`, and UI-independent `shared/domain` workspaces.

**Performance Goals**: Keep feature 005's current client and backend booking/availability/notification measurements authoritative and do not duplicate them. Add a duration only to an uncovered critical Functions operation when it materially helps support; do not introduce frontend tracing, transaction sampling, or general APM.

**Constraints**: No PII, credentials, raw identities, user-entered text, request/provider payloads, or unfiltered URLs in telemetry. Monitoring must fail open for business operations. Public source-map files and the Sentry upload token must not enter Hosting assets. Firebase rules, tenant checks, callable/HTTP contracts, booking transactions, and existing deployment targets remain unchanged.

**Scale/Scope**: Three browser applications and the existing Functions operation paths; error events and bounded operational logs only. No session replay, product analytics, general APM/tracing, or backend Sentry.

## Research Decisions

### Frontend SDK, lifecycle, and navigation

- Use one Sentry project/DSN per frontend within the approved Sentry organization, so releases and issue ownership are separated. Tag each event with a fixed app identifier, environment, and Git-SHA release; do not attach an authenticated user or tenant.
- Initialize a small workspace-local monitoring module before `createRoot`/`hydrateRoot`. The client initializes before hydration in `client/src/main.tsx:9-30`; collaborator and backoffice initialize before their roots in their respective `src/main.tsx` files. Wrap rendered trees with Sentry's React error boundary without replacing existing user-facing fallbacks.
- Let the SDK's browser integrations cover uncaught exceptions and unhandled rejections; do not add parallel `window.onerror` or `unhandledrejection` handlers. Add tests that detect duplicate reports when a React error reaches both boundary and global handling.
- The applications have distinct route ownership (`client/src/App.tsx`, `collaborator/src/router/index.tsx`, `backoffice/src/router/index.tsx`). Add only a safe route-template breadcrumb appropriate to each router. Do not enable Sentry browser tracing or route transactions in this scope.
- Use `sendDefaultPii: false`; do not call `setUser`; do not enable replay, request-body capture, console/network breadcrumbs, or user-interaction recording. A `beforeSend`/breadcrumb policy must allowlist safe fields, discard query strings/fragments and arbitrary breadcrumb messages, remove user/request/auth context, and redact or replace exception messages that can contain user-controlled data. Preserve stack frames for diagnosis where they pass the privacy tests.

Official references: [Sentry React](https://docs.sentry.io/platforms/javascript/guides/react/) and [Sentry React Router 7](https://docs.sentry.io/platforms/javascript/guides/react/features/react-router/v7/). The Router integration is not selected for this first version because its tracing transactions overlap the explicit performance-scope exclusion.

### Private source maps and release configuration

- Configure the Sentry Vite plugin in all three existing Vite configs. Production release builds generate hidden source maps, upload them to the matching private Sentry project, and remove them from each `dist` directory after a successful upload. A build-time artifact assertion must fail if any `*.map` remains before Firebase Hosting deploys.
- Keep the existing `firebase.json` site definitions and public roots (`client/dist`, `collaborator/dist`, `backoffice/dist`) unchanged. Do not rely on Firebase Hosting's existing ignore patterns to protect `.map` files; they do not currently exclude them (`firebase.json:16-45`).
- Browser-visible configuration may use `VITE_SENTRY_DSN`, `VITE_SENTRY_ENVIRONMENT`, and `VITE_SENTRY_RELEASE`; DSNs are public ingestion identifiers, not credentials. Keep `SENTRY_AUTH_TOKEN` server-side in the restricted release environment only, never under a `VITE_` name, in an example env file, in source control, or in generated bundles. Configure organization/project identifiers as non-secret build settings.
- Local tests/builds send no Sentry events by default. An explicit staging environment uses its own DSNs and release; a production release with monitoring enabled must fail its release preflight if private artifact upload cannot complete. Keep the existing `npm run deploy:hosting` and Firebase target configuration; the authorized deployment operator supplies required release environment values. No deploy is part of this plan stage.
- Verify both halves of the guarantee: the staging Sentry issue resolves to a source-mapped frame, and all three built Hosting roots contain no `.map` file or upload-token sentinel. Never print or inspect a real token during verification.

Reference: [Sentry Vite source-map upload](https://docs.sentry.io/platforms/javascript/guides/react/sourcemaps/uploading/vite/).

### Firebase Functions logging and safe correlation

- Keep the SDK-native `logger` from `firebase-functions` and structured key/value fields; no second sink and no Functions Sentry DSN/dependency. The existing `functions/src/services/availability.service.ts`, `booking.service.ts`, and `appointment-notification.service.ts` already emit `booking.performance` records; these records remain owned by feature 005.
- Add a narrow Functions logging/sanitization helper only if shared call sites require it. Emit allowlisted fields such as function/operation, stage, outcome, duration for an uncovered operation where useful, safe error category/code, and an opaque correlation ID. Do not log raw `Error` objects, free-form exception/provider messages, request bodies, headers, Twilio signatures/payloads, user IDs, tenant IDs, appointment IDs, customer contact data, or message contents. Do not log routine validation/authorization rejections as unexpected errors.
- Log once at the owning Functions boundary: actionable unexpected failures at error severity; bounded provider or retry conditions at warning severity; only operationally useful success outcomes at info. Avoid logging both in a service and its callable wrapper. Pass existing `HttpsError` responses through unchanged and verify their current messages are static/safe. For unexpected failures, log allowlisted metadata rather than the raw exception and return/rethrow the existing generic internal response shape; for the notification trigger, use a safe retry sentinel so platform retry behavior is retained. Tests must lock down callable codes, HTTP status/body, and retry semantics.
- Use Google-provided execution context for records within one invocation. For a booking that queues a Firestore notification job, generate a random server-side UUID, persist it on that server-only job, add it to the existing backend booking timing records, and log it from the worker. Do not create a separate timing event or use appointment/job/tenant/customer identifiers as log correlation. Keep the correlation field out of browser performance logs and user-facing responses.
- Document Logs Explorer queries over time, severity, function/resource, `jsonPayload.operation`, and (where available) `labels.execution_id`; use the opaque `correlationId` only to join the booking and worker records. Restrict access and configure retention/alert budgets according to the system owner's policy. Cloud Logging remains the backend source of truth.

Reference: [Firebase Functions logging](https://firebase.google.com/docs/functions/writing-and-viewing-logs). Generation 2 functions are declared in `functions/src/index.ts` and `firebase.json:9-15`.

## Explicit Review Criteria

1. **No duplicate performance instrumentation** — Preserve the existing client-side booking timing in `client/src/services/availability.service.ts` and `appointment.service.ts`, and backend stage timing in Functions services. Add no second duration/latency event for covered booking, availability, or notification paths, no trace/transaction sampler, and no parallel `booking.performance` stream. A safe correlation field may enrich an existing backend record without changing its stages or adding records. A duration on an uncovered critical Functions operation is permitted only when useful and must not replicate feature 005. Regression tests assert covered event counts, operation/stage values, and duration semantics remain intact.
2. **Private source maps** — Upload maps privately to Sentry during configured release builds, remove them before Hosting deployment, and fail the artifact check if a public `*.map` remains. Verify a staging stack trace resolves while all three public build directories lack maps and the upload credential.
3. **Verifiable tests** — Each frontend must have a controlled render-error, uncaught-exception, and rejected-promise capture test using a mocked/test transport; privacy tests seed fake names, phone/email, message text, token/header, query, and provider payload data and assert none reach transport. Functions tests assert structured fields/severity and sanitization for success, expected rejection, provider failure, and unexpected failure, with callable/HTTP outcome and retry semantics unchanged.
4. **Backend sink** — Use only Firebase/Google Cloud structured logging for Functions. No Sentry Functions dependency, DSN, initialization, or event transport is part of the first version.
5. **Architecture, security, and deploy preservation** — Keep instrumentation within the responsible workspaces; do not move monitoring into `shared/domain`. Do not change tenant/role checks, Firestore/Storage rules, booking integrity, user-visible error behavior, Hosting sites/rewrites, Functions region/runtime, or existing deploy commands. Verify emulator security tests and existing relevant suites.

## Test and Verification Design

### Automated frontend tests

- Add workspace-local initialization/redaction tests in Vitest/jsdom; use an SDK test transport or mocks so tests never contact Sentry.
- For each of `client`, `collaborator`, and `backoffice`, render a deliberate boundary failure and simulate an uncaught exception plus an unhandled rejection. Assert one event per failure, correct fixed app/environment/release, safe route template, no raw URL query/fragment, and no user/request context.
- Feed the sanitizer fake PII, auth headers/tokens, free-form message/breadcrumb values, and provider/request data. Assert sensitive values are absent from the serialized event before transport; assert expected/handled errors are not reported as unhandled.
- Build each frontend and assert the final Hosting assets have no `.map` files and no upload-token sentinel. Run a separately controlled staging smoke event to verify remote capture and source-map resolution; never target production for the smoke test.

### Automated Functions tests

- Unit-test the logging helper (if added) with spies on the Firebase logger: structured fields, severity, allowed error category, exact redaction, and logger failure not changing operation behavior. If duration is added to an uncovered operation, assert its presence/type there and assert no new duration record is emitted for a feature-005-covered path.
- Test representative callable and HTTP boundaries: expected `HttpsError`/validation outcomes are not promoted to unexpected error events; an injected unexpected error yields one sanitized record and preserves the established public error response/status. Test provider rejection and worker retry behavior without logging raw provider payloads.
- Extend the existing booking/notification emulator coverage in `functions/src/functions/appointments/create-public-appointment.spec.ts` and service tests to verify the random correlation value is persisted in the job and appears in the existing backend timing records/worker record, is not derived from business identifiers, and adds no duration event. Assert customer and tenant data remain absent from emitted log fields.
- Use existing emulator-backed authorization/tenant isolation tests; do not weaken or edit `firestore.rules`. The notification-job collection remains denied to clients by the catch-all rule.

### Repository checks and operational validation

- Run `npm test`, `npm run test:emulator`, `npm run lint`, `npm run format:check`, `npm run build`, and `npm run build:hosting` after implementation. These are planned checks only; none were run while preparing this plan.
- In a non-production project, verify one explicitly marked event from each frontend, one representative Functions structured record, Logs Explorer filtering, correlation across a booking and its worker, and source-map symbolication. Confirm no production event is generated.
- Check event/log volume and retry behavior in staging. Set thresholds, retention, and alerting with the system owner before production enablement; no numeric policy is assumed here.

## Environment, External Setup, and Risks

- Required external setup: approved Sentry organization with three frontend projects/DSNs and a non-production environment; restricted source-map upload token available only to the release process; environment/release naming; authorized Sentry and Cloud Logging access; an isolated Firebase staging/emulator verification path.
- `VITE_SENTRY_DSN`, `VITE_SENTRY_ENVIRONMENT`, and `VITE_SENTRY_RELEASE` are browser build configuration, not secrets. `SENTRY_AUTH_TOKEN` is a secret and must not be added to `.env.example` or any client-prefixed variable. Functions need no monitoring secret or new Sentry environment variable.
- No `.github/workflows/` directory was found in the reviewed repository. The release process that runs the existing Hosting build/deploy commands must therefore be identified and supplied the token through its approved secret mechanism; do not create or assume a CI provider in this plan.
- A missing/misconfigured release credential can block a monitored production build; configure staging and release secrets before enabling that guard. A failed upload must not silently publish source maps or a release claiming symbolicated diagnostics.
- Default console/network breadcrumbs, raw exception messages, provider errors, high-volume expected failures, and retries are the primary privacy/noise risks. Use allowlisted fields, one logging boundary, deduplication, and non-production smoke tests.
- The opaque correlation field is persisted with a notification job for the job's existing lifecycle. It grants no access and is not an authorization input; verify that existing rules continue to deny client reads/writes and that it is never copied into public responses.
- No production Firebase state, deployment, seed/import command, or real monitoring event is changed or run as part of planning.

## Constitution Check

**Pre-design gate: PASS.** The plan keeps frontend integrations in their respective workspaces, Functions logging in `functions`, and leaves `shared/domain` UI-independent (Constitution VI; `AGENTS.md:6`). It does not change the customer flow, booking/availability integrity, status transitions, or transaction semantics (Constitution I-II). It leaves server-side authorization, role boundaries, tenant scoping, and Firebase rules authoritative; IDs are not telemetry fields (Constitution III; `firestore.rules:8-24,67-69`). Automated tests and existing checks remain required (Constitution V). Framework, source-map, logging, and deployment choices are confined to planning as required by the constitution's specification boundary (lines 187-203).

**Post-design gate: PASS, subject to implementation tests.** Sentry is browser-only; backend records use the native Functions logger. The only proposed persistence addition is an opaque server-generated correlation field in the existing server-managed notification job, with no rule or public contract change. Monitoring failure does not block business operations. Hosting roots, rewrites, Functions runtime/region, and existing commands remain in place. The implementation must prove redaction, artifact removal, unchanged business/error outcomes, and multi-tenant isolation before approval for production.

## Project Structure

### Documentation in this approval stage

```text
specs/008-observability-and-logs/
├── spec.md
├── plan.md              # only artifact created in this planning stage
└── checklists/
    └── requirements.md
```

### Proposed implementation touchpoints (not changed in this stage)

```text
client/
├── package.json
├── vite.config.ts
└── src/
    ├── main.tsx
    └── monitoring/      # new initializer, safe route context, unit tests
collaborator/
├── package.json
├── vite.config.ts
└── src/
    ├── main.tsx
    ├── router/index.tsx
    └── monitoring/      # new initializer, safe route context, unit tests
backoffice/
├── package.json
├── vite.config.ts
└── src/
    ├── main.tsx
    ├── router/index.tsx
    └── monitoring/      # new initializer, safe route context, unit tests
functions/src/
├── model/appointment-notification-job.model.ts
├── services/
│   ├── booking.service.ts
│   ├── appointment-notification.service.ts
│   └── diagnostic-logging.service.ts  # only if shared sanitizer/helper is justified
└── functions/           # focused boundary tests for existing callables/worker
package.json             # source-map build-time dependency/configuration only
package-lock.json
firebase.json            # unchanged
firestore.rules          # unchanged
```

**Structure Decision**: Keep the current three frontend boundaries, Firebase Functions boundary, and Firebase deployment topology. Add frontend monitoring locally to each application because their entry/routing trees differ. Keep server logging native and shared only through a narrow Functions-local helper if tests demonstrate repeated sanitization logic. Do not add a fourth workspace or shared UI/domain telemetry abstraction.

## Complexity Tracking

No constitution exceptions are proposed. A separate backend error platform, global tracing layer, new Firebase deployment target, or change to security rules is explicitly out of scope.
