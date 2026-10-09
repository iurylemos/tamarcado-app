# Product Customization and Image Gallery Contract

## Boundary

The backoffice configures product attributes, default images, and optional exact
combination galleries. It uploads/deletes image objects directly using
Firebase Storage and saves gallery metadata through authorized Functions
callables. The public client reads published metadata, selects option IDs,
renders the corresponding gallery, and submits IDs with an appointment.
Functions validates current product/gallery data and is authoritative for
appointment snapshots. Collaborator appointment views display the selected
image and customization snapshot.

## Product data

The existing `saveProduct` callable accepts:

- optional dynamic `customizationAttributes`;
- one to ten default image references;
- the existing `imageUrl` field maintained as the first image for legacy
  consumers.

Each image reference contains a stable `id`, tenant/product-scoped
`storagePath`, and its public `downloadUrl`. Existing product documents without
the new image list continue to use their current `imageUrl` as the first
default image.

Each attribute contains `id`, `label`, at least two `{ id, label }` options,
and `defaultOptionId` belonging to that attribute. Product customization is
optional. The server rejects invalid or ambiguous attributes and default
gallery counts outside one to ten.

## Upload and delete product image objects

The backoffice uploads JPEG, PNG, or WebP files up to 5 MB each to a path
scoped to the active backoffice tenant and product. Storage Rules authorize
create/delete only when the authenticated claims have an active backoffice role
and matching `tenantId`. Public reads are enabled for product image asset paths.

The client uploads objects before publishing their metadata. If publishing
fails, it attempts to clean up staged uploads and reports both the original
failure and any cleanup failure. Gallery metadata is removed before deleting
objects, so a deletion error may leave an unreferenced object; this is an
explicit partial failure, not success, and must identify that cleanup did not
complete.

## Save/read combination galleries

The authorized backoffice workspace returns variant galleries for that
tenant's products. `saveProductGallery` creates or updates one gallery for
exactly one existing option in every configured product attribute. It accepts
one to ten image references and validates that the product belongs to the
authorized tenant.

`deleteProductGallery` removes one exact-combination gallery and its public
projection. The backoffice then deletes the gallery's Storage objects and
reports cleanup failures explicitly.

Each gallery is identified by stable attribute/option IDs, not labels. The
public catalog reads all published variant galleries for the requested business
in one query alongside its product query. Public gallery documents expose only
product ID, combination selections/key, and image references.

For each combination:

- use its variant gallery when it exactly matches the complete selected option
  set;
- otherwise use the product's default gallery.

Catalog product cards display the first default image.

## Create public appointment

The existing appointment callable accepts the existing booking fields plus:

| Field | Required | Meaning |
|---|---:|---|
| `customizationSelections` | When attributes exist | Exactly one `{ attributeId, optionId }` for each configured attribute |
| `selectedImageId` | Optional | Current main image ID from the effective gallery |

The client does not send authoritative labels, image URLs, product
descriptions, or price overrides. Functions verifies all selections against
the active tenant-owned product, resolves the exact gallery or default
fallback, validates `selectedImageId` belongs to that effective gallery, and
derives the selected image URL and historical attribute labels on the server.
If `selectedImageId` is omitted for a legacy product, Functions uses the first
image of the effective/default gallery or its legacy `imageUrl`.

Invalid, missing, duplicate, extra, stale, or cross-product attribute/option
IDs and image IDs are rejected before appointment creation. A product without
attributes accepts an omitted or empty selection list.

The existing success response remains unchanged. The appointment transaction
stores the optional customization snapshot and the validated selected image
URL in `productImageUrlSnapshot`; commercial snapshots and reservation writes
remain unchanged.

## List appointments

The existing collaborator appointment listing returns optional customization
snapshots and `productImageUrlSnapshot`. Appointment cards display the selected
variant image when present. Historical appointments without new fields remain
readable; deleted files may make a stored image URL unavailable.

## Error outcomes

Invalid or incomplete image uploads, authorization failures, invalid gallery
combinations, stale selections, and cleanup failures must be visible and
actionable. A file deletion failure must not be reported as a fully successful
gallery deletion. Existing appointment error meanings for invalid product,
tenant, or slot data remain unchanged.

## Compatibility

- Existing product documents without `customizationAttributes` or image arrays
  remain valid; `imageUrl` is their default image.
- Existing appointment requests for products without attributes retain their
  current payload and success response.
- Existing appointment documents without a customization snapshot remain
  readable by the collaborator application.
