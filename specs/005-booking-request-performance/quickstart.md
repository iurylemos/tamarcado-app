# Quickstart: Booking Request Performance

## Prerequisites

- Install the repository's existing npm dependencies.
- For Firestore-backed booking tests, run the Firebase Functions and Firestore emulators configured in `firebase.json`.
- Use the seeded public business, services, professionals, working hours, appointments, and reservations from the existing Functions test fixtures.

Start emulators in one PowerShell terminal:

```powershell
firebase emulators:start --only firestore,functions
```

## Automated Validation

Run the focused public booking tests:

```powershell
npm --prefix client test -- src/pages/BookingPage.spec.tsx
npm --prefix functions test -- src/functions/appointments/create-public-appointment.spec.ts
```

Run both existing package builds/type checks:

```powershell
npm --prefix client run build
npm --prefix functions run build
```

Run the Functions integration test in a second PowerShell terminal with the emulator host configured:

```powershell
$env:FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
$env:GCLOUD_PROJECT = 'demo-booking-perf-20261008'
npm --prefix functions test -- src/functions/appointments/create-public-appointment.spec.ts
```

Use a dedicated emulator project ID as above: the fixture clears its own Firestore collections before each integration scenario. When an emulator is already running in another terminal, point the tests at it rather than starting or stopping another emulator instance.

The Firestore emulator integration test must prove that concurrent overlapping requests still result in only one accepted appointment.

## Behavioral Scenarios

1. Search on a date with openings; verify the date remains selected and its available slots appear.
2. Search on a date with no openings and a later date with openings; verify the earliest later date and its slots appear automatically.
3. Search a date with no openings for the entire 31-date window; verify a clear empty result and the ability to select a different date.
4. Delay notification processing and the post-booking availability refresh; verify a valid booking returns its existing receipt as soon as appointment registration succeeds.
5. Force a provider send failure; verify the appointment remains pending, the notification outcome is recorded separately, and no personal data appears in timing logs.
6. Submit two overlapping requests concurrently; verify only one request succeeds.

## Performance Measurement

In a dedicated staging environment with representative schedules and booking volume, using test notification destinations:

1. Measure client-observed search and successful submission durations under ordinary network conditions, separating cold-start and warm requests where possible.
2. Collect at least 100 search samples and 100 successful booking samples before calculating p95; keep notification completion time separate from appointment response time.
3. Verify at least 95% of searches and successful submissions meet the 3-second targets in the feature specification.
4. Confirm that searches covering an empty selected date and a later available date make one customer-visible search operation, not one request per candidate date.
5. Inspect structured stage measurements for shared-data reads, conflict reads, slot evaluation, transaction, notification processing, and cold-start indicator. Confirm no customer name, phone number, or message body is present.

Emulator tests validate correctness and request behavior; production-like staging measurements are required to validate latency targets.

### Staging measurement record

Record the staging deployment, sample window, network conditions, cold-start classification, and the p95 for each operation before accepting the latency goals:

| Operation | Samples | Cold p95 | Warm p95 | Overall p95 | Under 3 seconds |
|---|---:|---:|---:|---:|---:|
| Availability search | 100 minimum | Pending | Pending | Pending | Pending |
| Successful appointment registration | 100 minimum | Pending | Pending | Pending | Pending |
| Notification processing | 100 minimum | Pending | Pending | N/A (separate from response) | Report separately |

Do not substitute emulator timings for staging results. Staging measurements remain outstanding until the deployed environment and test notification destinations are available.
