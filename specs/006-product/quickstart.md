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
