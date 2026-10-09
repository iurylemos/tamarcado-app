# Quickstart: Validar atributos e imagens por variação

## Prerequisites

- Install the repository's existing npm dependencies.
- Enable Firebase Storage for the Firebase project and configure the bucket
  setting required by the backoffice.
- Use the existing Firebase Emulator Suite with the Storage Emulator enabled
  for upload, delete, and rule-validation scenarios.
- No new runtime package is required.

## Automated verification

Run focused behavior suites in the affected workspaces:

```powershell
npm test --workspace backoffice -- src/pages/ProductsPage.spec.tsx
npm test --workspace client -- src/services/catalog.service.spec.ts src/pages/BookingPage.spec.tsx
npm test --workspace collaborator -- src/pages/AppointmentsPage.spec.tsx
npm test --workspace functions -- src/functions/backoffice/manage-company.spec.ts src/functions/appointments/create-public-appointment.spec.ts
```

When Authentication and Firestore emulators are already running alongside a
Functions worker, use a separate demo project namespace for Firestore tests so
test cleanup cannot race the live worker:

```powershell
$env:GCLOUD_PROJECT = "demo-tamarcado-validation"
$env:FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099"
$env:FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080"
npm test --workspace functions -- --no-file-parallelism src/functions/backoffice/manage-company.spec.ts src/functions/appointments/create-public-appointment.spec.ts
```

Run the Storage Rules tests with Authentication, Firestore, and Storage
emulators available:

```powershell
$env:GCLOUD_PROJECT = "demo-tamarcado"
$env:FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099"
$env:FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080"
$env:FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199"
npm test --workspace functions -- test/storage.rules.spec.ts
```

Run emulator-backed Functions tests with Authentication, Firestore, Functions,
and Storage emulators enabled:

```powershell
firebase emulators:exec --project demo-tamarcado --only auth,firestore,functions,storage "npm run test --workspace functions"
```

Build each affected workspace:

```powershell
npm run build --workspace backoffice
npm run build --workspace client
npm run build --workspace collaborator
npm run build --workspace functions
```

## Seed data

Development and production use the same document definitions in
`functions/test/fixtures/seed-data.ts`. The sample Casa Nativa Móveis business
includes a modular sofa and an upholstered headboard with their customization
options. Their legacy `imageUrl` values are used as the default gallery, avoiding
references to Storage objects that the seed does not upload.

`npm run seed:emulator` clears Auth, Firestore, and Storage before loading the
shared sample data. It refuses non-`demo-*` project IDs and non-local emulator
hosts. This reset is specific to the emulator; the production seed continues to
upsert the shared documents without deleting other production data.

The sample backoffice login is `admin@casanativa.test`; emulator seed users use
the password `EmulatorOnly123!`. Production seed passwords remain separately
configured through `SEED_USER_PASSWORDS_JSON`.

## Manual end-to-end checks

1. Sign in as a backoffice user for Studio Aurora and create/update a product
   with one default image.
2. Upload valid JPEG, PNG, and WebP examples up to 5 MB. Verify an invalid MIME
   type, a file over 5 MB, and an eleventh image in a gallery are rejected.
3. Add a gallery for an exact option combination, such as Cor=Castanho. Verify
   that the combination requires one option for every configured attribute.
4. Attempt upload and deletion with an inactive account and an account from a
   different tenant; both operations must be denied.
5. Open the public catalog. Verify the card uses the first default image.
6. Open booking, select the configured combination, and verify the image
   gallery changes immediately. Select a combination without a specific gallery
   and verify the default image gallery appears.
7. Use the main image and carousel to select an image, submit the appointment,
   and verify the collaborator agenda card displays that selected image and
   selected customization labels.
8. Remove an image and verify its object is deleted. Simulate delete failure
   and verify the UI reports partial failure rather than full success.
9. Verify products with only legacy `imageUrl` and appointments without
   customization fields still render and book correctly.

## Expected behavior

- Every product displays a default gallery with one to ten images.
- Each optional exact-combination gallery has one to ten images and references
  one valid option for every configured attribute.
- Customer-facing cards use the default gallery; booking uses exact-combination
  images or falls back to default.
- The first effective image is the main image; accessible carousel controls
  allow choosing another image.
- Appointment snapshots contain the server-resolved selected image URL and
  option labels.
- Public reads work for product image paths; upload/delete require active
  backoffice role and matching tenant.
- Legacy product URLs and appointments remain compatible.
