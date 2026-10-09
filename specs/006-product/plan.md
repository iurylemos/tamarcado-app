# Implementation Plan: Personalização dinâmica de produtos no agendamento

**Branch**: `006-product` (Spec Kit feature identifier; no Git branch created)  
**Date**: 2026-10-08  
**Spec**: [spec.md](./spec.md)

**Input**: Approved feature specification in `specs/006-product/spec.md`

## Summary

Extend the existing product editor and booking flow with optional dynamic
attributes and image galleries. Every product has a default gallery; optional
variant galleries are associated with exact combinations of selected
attribute/option IDs. Backoffice uploads JPEG/PNG/WebP files to Firebase Storage.
Public catalog cards show the default image; the booking summary switches to
the exact-match gallery or falls back to default, with a main image and
thumbnail carousel. Appointment creation validates the selected attributes,
stores their historical labels and the effective main image URL, and existing
collaborator cards display the selected image.

## Technical Context

**Language/Version**: TypeScript; Node.js 24 for Firebase Functions; React 19
for the client applications

**Primary Dependencies**: Existing Firebase Web SDK 12.19 (including Storage),
Firebase Admin 14.5, Firebase Functions 7.4, React 19, React Router 7, Vitest 5,
and Testing Library. No new runtime package is planned.

**Storage**: Cloud Firestore for products, public product projections,
combination-gallery metadata, and appointments. Firebase Storage for uploaded
image objects.

**Testing**: Existing Vitest suites and TypeScript/Vite builds for affected
workspaces; Firestore and Storage emulators for persistence and security-rule
validation.

**Target Platform**: Client, backoffice, and collaborator web applications;
Firebase Functions v2, Cloud Firestore, and Firebase Storage.

**Project Type**: Multi-workspace full-stack appointment-booking feature.

**Performance Goals**: Keep uploads and catalog reads bounded by the specified
gallery sizes (maximum 10 images per gallery). Load the public product gallery
metadata with the catalog request rather than a request per product or
attribute. Do not add per-attribute callable requests to booking.

**Constraints**: Scope writes by authenticated backoffice role and tenant;
allow public reads only for product image asset paths; expose image URLs in the
public catalog only through published product/gallery metadata; validate MIME
type and size in Storage Rules and UI; validate variant combinations server-side; preserve
legacy `imageUrl` values; keep Firestore documents below platform limits by
storing each variant gallery separately; preserve price, duration, commission,
availability, and status behavior.

**Scale/Scope**: Product editor, image upload/removal and Storage rules,
FireStore product/public projections, catalog and booking gallery, appointment
validation/snapshots, collaborator agenda, Firebase emulator configuration,
shared domain types, fixtures, and focused tests.

## Constitution Check

*Gate before Phase 0 and re-check after Phase 1 design.*

- **I. Domain and User Flow Integrity — PASS**: Galleries and selections remain
  scoped to the product and business of the current public catalog.
- **II. Booking and Availability Integrity — PASS**: Gallery and option changes
  do not change slot availability or booking rules.
- **III. Security and Authorization — PASS WITH DESIGN CONSTRAINT**: Storage
  rules scope writes to active backoffice claims and the tenant path; public
  image reads are limited to published product image paths. Firestore callable
  authorization remains authoritative for gallery metadata.
- **IV. Financial and Reporting Consistency — PASS**: Images and customization
  do not affect commercial snapshots or reports.
- **V. Testability and Quality — PASS**: Validate option combinations, upload
  constraints, Storage/Firestore authorization, fallback galleries, snapshots,
  and legacy image URLs.
- **VI. Separation of Application Boundaries — PASS**: Backoffice owns product
  and image management; client reads published product data; Functions validates
  and persists appointment values; collaborator displays booking snapshots.
- **VII. User Experience and Accessibility — PASS WITH DESIGN CONSTRAINT**:
  Gallery controls have accessible labels and keyboard operation; image loading,
  upload failure, empty combination fallback, and responsive layout are covered.
- **VIII. Maintainability and Simplicity — PASS WITH DESIGN CONSTRAINT**:
  Store combination galleries as individual Firestore records rather than a
  general media-management subsystem or unbounded embedded array.

**Initial gate result**: PASS. These constraints are mandatory.

## Phase 0: Research Decisions

Research is complete in [research.md](./research.md). The project already has
the Firebase Web SDK, but has no Storage initialization, Storage emulator
configuration, or Storage Rules. The new integration and its deployment
configuration are included in this plan.

- Keep the required default gallery on the existing product/public product
  records; interpret the legacy `imageUrl` as the first default image.
- Store each optional exact-combination gallery as a separate
  `product_image_galleries` document and mirror published metadata in
  `public_product_galleries`. This avoids an unbounded gallery array in a
  Firestore product document.
- Query public galleries once by tenant/business alongside the product catalog
  and group them by product and canonical selection IDs; do not issue one query
  per product or attribute.
- Upload objects directly from the backoffice through the existing Firebase
  Web SDK. Use Storage Rules for authenticated role/tenant, file size, and MIME
  constraints. Use existing authorized callables for Firestore metadata writes.
- Save metadata before deleting removed Storage objects; a failed object cleanup
  must produce an explicit partial-failure result and must not appear as full
  success. Upload files before publishing metadata; if metadata save fails,
  attempt cleanup and surface cleanup errors.
- Persist the selected gallery's first image URL as the appointment image
  snapshot; collaborator appointment cards continue using the existing field.
- Preserve and display legacy external `imageUrl` as a default-gallery image;
  no one-time production migration is required for reads.
- Add an explicit Storage bucket configuration and Storage Emulator/rules
  deployment configuration; do not assume that `firebase.json` currently
  configures them.

## Technical Design

### Product attributes and default images

Add shared types for product attributes/options, gallery images, variant gallery
selection keys, appointment selections, and snapshots. The product's optional
`customizationAttributes` remains dynamic; each attribute has at least two
options and one default. Add an image list to the product and public product.
The current `imageUrl` remains readable as the first default image for existing
records; backoffice saves maintain the canonical default image list and the
legacy first-image field together until compatibility is no longer required.

Every product save must contain one to ten default image references. Each
reference stores a stable image ID, Storage object path, and customer-facing
download URL. New product IDs are generated client-side before upload so the
objects can use a tenant/product-scoped path, then are submitted to the
authorized `saveProduct` callable with the uploaded image references. Failed
product saves trigger cleanup of staged objects.

### Combination galleries and catalog projection

Create one internal and one public gallery record for every explicitly
configured exact option combination. A combination records exactly one
`attributeId`/`optionId` pair per configured attribute. Its canonical key is
computed from sorted stable IDs, not labels or user-entered text. Each record
contains tenant, business slug, product ID, combination key/selections, and one
to ten image references. No gallery document is required for combinations that
use the default gallery.

The authorized backoffice workspace returns gallery records with products.
An authorized callable upserts/removes one combination gallery and updates its
public projection. The public catalog reads published gallery records for the
current business in one query alongside products. Browser catalog mapping and
server-rendered storefront output use the same public gallery shape. Cards
always display the first default image.

On save/remove, validate the product, tenant, exact configured selection set,
unique combination key, and image count. Removing a gallery removes its public
projection and then cleans up its files. Removing an image follows the
metadata-first cleanup order above to avoid showing deleted assets as active
gallery members.

### Storage upload, authorization, and cleanup

Initialize Firebase Storage in the backoffice using an explicit configured
bucket; connect to the Storage Emulator in emulator mode. Add `storage.rules`
and register it in `firebase.json`. Rules allow public reads under product image
asset paths and allow create/delete only when auth claims
identify an active backoffice user whose tenant matches the path. Upload rules
enforce JPEG, PNG, or WebP and a maximum size of 5 MB per object.

The backoffice UI allows at most ten images per gallery, shows upload progress,
and blocks gallery saves while required uploads are incomplete. Removing an
image removes its gallery metadata and deletes the underlying object. Surface
partial failures explicitly (for example, metadata removed but object cleanup
failed) rather than reporting a complete success. Do not allow an uploader to
target another tenant or product path.

### Client gallery and booking

The service summary presents the first effective gallery image as a large main
image at the top and the other images in an accessible thumbnail carousel. A
single image has no unnecessary carousel navigation. Changing any configured
attribute recomputes the canonical combination: use its gallery only when the
exact complete combination has one, otherwise show the default gallery. The
default is also used while attributes are initially set to their defaults if
that exact combo is not registered.

The catalog card uses the first default image. On booking submission the client sends only attribute/option IDs and the
selected main image ID; Functions re-resolves the combination and authoritative
URL from Firestore, validates the image belongs to the effective gallery, and
stores the server-derived URL in `productImageUrlSnapshot`. It derives selection
and label snapshots from current product data, not client-provided labels.

### Appointment team views and compatibility

Appointments keep an optional customization snapshot and existing image URL
snapshot. The list callable forwards both. The collaborator agenda card uses
the selected variant image when saved; existing appointments continue to use
their previous image field or show the existing no-image state. Deleting a file
may make its historical URL unavailable, an explicitly accepted limitation.

Products without attributes still require a default gallery and use it for all
views. Products/documents without the new image list continue to display their
legacy `imageUrl`. Appointments without customization snapshots remain valid.

### Test data and verification

Keep `service-corte` and `service-consulta` as no-attribute compatibility
examples; preserve `service-hidratacao` as inactive. Extend test-only data for
`service-coloracao` (Cor), upholstery (Tecido), and a bed (Tamanho: Casal/King)
with image URLs that distinguish default, exact-match, and fallback galleries.
Add appointment cases with the selected image and legacy appointments without
new fields. Keep test fixtures isolated from `createSeedDocuments()` because
the production seed imports it.

Cover backoffice validation/upload/removal and rules, public gallery mapping
including SSR, selected-option gallery switching/fallback/carousel behavior,
Functions validation and server-derived snapshots, collaborator display,
legacy compatibility, and error/partial cleanup. Run affected Vitest suites,
workspace builds, and emulator checks including Storage Rules.

## Project Structure

### Documentation (this feature)

```text
specs/006-product/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── product-customization.md
├── spec.md
└── tasks.md                 # Generated later by /speckit-tasks
```

### Source Code (repository root)

```text
shared/domain/interfaces/
├── product.interface.ts
└── appointment.interface.ts

functions/src/
├── model/
│   ├── product.model.ts
│   ├── product-gallery.model.ts
│   └── appointment.model.ts
├── services/
│   ├── backoffice.service.ts
│   ├── public-catalog.service.ts
│   ├── booking.service.ts
│   └── appointment-operations.service.ts
└── functions/catalog/
    ├── get-public-catalog.ts
    └── render-storefront.ts

backoffice/src/
├── config/firebase.config.ts
├── services/product-image.service.ts
├── interfaces/admin.interface.ts
└── components/organisms/ProductEditor/

client/src/
├── interfaces/company.interface.ts
├── services/catalog.service.ts
└── components/
    ├── templates/CompanyCatalogTemplate/
    ├── templates/BookingTemplate/
    └── organisms/ProductImageGallery/

collaborator/src/
├── interfaces/appointment.interface.ts
└── components/organisms/AppointmentCard/

functions/test/fixtures/
└── product-customization-data.ts

storage.rules
firebase.json
```

**Structure Decision**: Extend the existing product, catalog, and appointment
boundaries. Use one public gallery metadata query per business and Firebase
Storage object paths scoped by tenant/product. Do not introduce a generic
asset-management service or a new workspace.

## Post-Design Constitution Check

- **I — PASS**: Gallery data and selection combinations remain business-scoped.
- **II — PASS**: Image selection does not affect availability or slot integrity.
- **III — PASS WITH CONSTRAINT**: Storage Rules and authorized callables enforce
  tenant/role ownership; public metadata exposes only published product assets.
- **IV — PASS**: Existing commercial snapshots remain unchanged.
- **V — PASS**: Validation includes Storage Rules, uploads, fallbacks, snapshots,
  and legacy records.
- **VI — PASS**: Storage concerns stay in backoffice/catalog boundaries;
  Functions validates booking input and collaborator renders persisted data.
- **VII — PASS**: Accessible carousel behavior, loading, fallback, and errors
  are specified.
- **VIII — PASS WITH DESIGN CONSTRAINT**: Separate exact-combination gallery
  documents keep the product document bounded; no generic media subsystem is
  introduced.

**Post-design gate result**: PASS. No complexity-tracking exception is needed.
