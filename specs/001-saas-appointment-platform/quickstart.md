# Quickstart: Validate the Appointment Commerce Platform

This guide covers local setup for the initial platform foundation and public booking flow.
Local Firebase configuration is pinned to the `demo-tamarcado` emulator project and does not
select a production Firebase project.

## Prerequisites

- Node.js version supported by the chosen Firebase Functions runtime.
- npm and Firebase CLI versions pinned by the implementation.
- A local Firebase Emulator Suite configuration for Authentication, Firestore, Functions,
  and Hosting.
- Test fixtures for two tenants, two roles, at least two professionals, active and inactive
  services, working hours, a blocked period, and appointments in each lifecycle state.
- A WhatsApp provider sandbox or deterministic provider test double. Do not use real customer
  phone numbers or send real messages in automated tests.
- The business timezone and booking interval configured for each fixture tenant.

## Planned Local Setup and Commands

```powershell
# From the repository root:
npm install
npm run build
npm test

# Start the local suite (Auth 9099, Firestore 8080, Functions 5001, Hosting 5000).
npm run emulators

# In a second terminal, seed repeatable demo businesses, users, services, schedules and appointments.
npm run seed:emulator

# Start the customer app; it uses local emulators automatically.
npm run dev:client

# Start the backoffice app.
npm run dev:backoffice
```

The collaborator and backoffice apps are also available through `npm run dev:collaborator` and
`npm run dev:backoffice`. Set each app's local `VITE_FIREBASE_PROJECT_ID` to `demo-tamarcado`;
do not use a production project ID while connecting to local emulators. The seed command
creates synthetic staff records and emulator-only Firebase accounts. The staff apps themselves
sign in only through the phone-verification flow; they do not accept the seeded email/password
accounts.

For simple development messaging, configure the Twilio WhatsApp Sandbox with the account SID,
auth token, and Sandbox sender in `functions/.env.example`; Content SIDs and templates are not
required. Each test recipient must join the Sandbox, and free-form messages can only be sent during
the 24-hour window after that recipient messages the Sandbox. Twilio's Sandbox is for functional
testing, not production, and trial messages may use the account's limited trial units. The status
callback and collaborator app URL are optional. Challenge lifecycle and authorization tests use
deterministic provider/store test doubles; do not use real customer phone numbers or send real
messages in automated tests.

The backoffice demo includes the Studio Aurora catalog (active and inactive services), three
collaborator profiles, service assignments, weekly hours, and a one-time blocked period. The
fixtures are synthetic; service and profile photos use remote demonstration images.

## Validation Scenarios

### 1. Public discovery and appointment booking

1. Open a published business page without signing in.
2. Verify only its approved business and active service information is visible.
3. Request available times for one service with one eligible professional and verify the
   professional is selected without an extra prompt.
4. Repeat with multiple eligible professionals and verify only eligible choices appear.
5. Submit a valid Brazilian phone, optionally opt in to appointment WhatsApp messages, and request an
   available time.
6. Verify the appointment is pending, commercial values are snapshotted, and the user sees
   the request result even if the provider test double reports a send failure.

**Expected**: Public users cannot access private data; a booking request is pending and
availability is revalidated at creation.

### 2. Concurrent overlapping bookings

1. Prepare one professional with a 15-minute booking interval and a service longer than one
   interval.
2. Submit multiple concurrent booking requests whose service intervals overlap.
3. Repeat with a start time on a different interval bucket and with a non-overlapping time.

**Expected**: At most one overlapping active appointment is accepted; conflicting attempts
return an unavailable result; a non-overlapping appointment may succeed. No partially written
appointment or reservation remains after a rejected transaction.

### 3. Tenant and role authorization

1. Sign in a collaborator for tenant A and a backoffice user for tenant B.
2. Attempt direct reads, list queries, writes, appointment changes, and report reads across
   tenant boundaries.
3. Attempt backoffice-only actions as a collaborator and professional-scope violations as a
   scoped collaborator.

**Expected**: Every unauthorized attempt is denied by the relevant Firestore Rules or trusted
operation. Responses do not disclose whether an out-of-scope record exists.

### 4. Appointment lifecycle and messaging

1. Confirm and cancel a pending appointment through permitted actors.
2. Complete a confirmed appointment; try invalid transitions, reassignment to an ineligible
   professional, and edits into blocked or occupied times.
3. Exercise WhatsApp verification success, invalid code, expiration, rate limit, opt-out,
   provider outage, and message delivery callback cases.

**Expected**: Only specified transitions persist; invalid edits leave the old reservation
intact; OTP verification does not set message consent; messaging failure does not confirm an
appointment.

### 5. Reports and exports

1. Prepare pending, confirmed, cancelled, and completed appointments, including records on
   both sides of a local month boundary.
2. Change current service price/commission after creating earlier appointments.
3. Compare collaborator totals, backoffice totals and breakdowns, and the CSV export.
4. Test a period with zero eligible transactions and a period with fewer than three ranked
   collaborators.

**Expected**: Only completed transactions count; historical snapshots remain unchanged;
month boundaries follow the business timezone; all filters and totals match the export;
empty reports are distinct from authorization/errors; unsupported rankings are omitted.

### 6. Public rendering, accessibility, and responsive states

1. Request public business/service URLs directly and inspect returned HTML without executing
   client JavaScript.
2. Verify route-specific title, description, canonical URL, and approved public content.
3. Navigate customer and staff critical flows at mobile and desktop sizes using keyboard
   interaction and inspect loading, empty, success, and error states.

**Expected**: Public pages contain crawlable content without private data; operational
workspaces are not publicly rendered; core flows expose semantic, keyboard-accessible,
responsive states.

## Completion Evidence

The feature is ready for implementation review when the acceptance scenarios above pass in
automated tests or a documented controlled manual run, the tenant-isolation and booking
concurrency suites pass, and report exports reconcile to the appointment source of truth.
