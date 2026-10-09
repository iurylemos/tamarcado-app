# Data Model: Personalização e imagens por variação

**Feature**: `006-product`  
**Source of truth**: [spec.md](./spec.md)

## Product customization definition

The product owns an optional list of `ProductCustomizationAttribute`
definitions.

| Field | Type | Required | Rules |
|---|---|---:|---|
| `id` | string | Yes | Stable within the product; unique among its attributes |
| `label` | string | Yes | Non-empty customer-facing attribute name |
| `options` | `ProductCustomizationOption[]` | Yes | At least two options; unique IDs and unambiguous labels within the attribute |
| `defaultOptionId` | string | Yes | Identifies exactly one option in this attribute's own list |

| Option field | Type | Required | Rules |
|---|---|---:|---|
| `id` | string | Yes | Stable within the attribute; unique among its options |
| `label` | string | Yes | Non-empty customer-facing option value |

Missing or empty `customizationAttributes` represents a product without
variations and remains valid for existing Firestore documents.

## Product image and default gallery

Every product has a default gallery with one to ten `ProductImage` entries.

| Field | Type | Required | Rules |
|---|---|---:|---|
| `id` | string | Yes | Stable identifier for an image within its owning product/gallery |
| `storagePath` | string | Yes | Storage object path scoped to tenant and product |
| `downloadUrl` | string | Yes | URL used to render the published image |

The existing `imageUrl` remains readable as the first default image for legacy
products. When the default gallery is updated, its first image remains the
product's primary image and is used by catalog cards.

## Variant image gallery

An optional gallery is stored for an explicitly configured exact combination.
Each combination selects exactly one option from every attribute on the
product. Combinations without their own gallery use the default gallery.

| Field | Type | Required | Rules |
|---|---|---:|---|
| `id` | string | Yes | Stable gallery document ID |
| `tenantId` | string | Yes | Same tenant as the product |
| `businessSlug` | string | Yes | Same public business as the product |
| `productId` | string | Yes | Owning product ID |
| `combinationKey` | string | Yes | Canonical key computed from sorted attribute and option IDs |
| `selections` | `ProductCustomizationSelection[]` | Yes | Exactly one valid option per configured attribute |
| `images` | `ProductImage[]` | Yes | One to ten entries |
| `published` | boolean | Yes | Public projection read is allowed only when true |

Internal and public gallery metadata are stored as separate documents to avoid
an unbounded variant-gallery array in the product document. Public documents
include only fields required by catalog/gallery selection and omit internal
commercial or administrative data.

For a gallery with a single image, render the main image without unnecessary
carousel navigation. For multiple images, the first entry is initially the main
image and the remaining entries are available through the accessible carousel
and thumbnails.

## Image file constraints and ownership

- Accepted content types: `image/jpeg`, `image/png`, and `image/webp`.
- Maximum object size: 5 MB per image.
- Maximum image count: ten in the default gallery and ten in each variant
  gallery.
- Upload and delete are authorized only for an active backoffice user whose
  tenant matches the object path.
- Public reads are allowed under product image asset paths; only references in
  published catalog metadata are presented to customers.
- Removing an image removes its gallery reference and deletes its object. A
  storage-cleanup failure must be surfaced explicitly. Deletion may make old
  appointment image URLs unavailable.

## Appointment customization selection

The public appointment request may contain a list of selections:

| Field | Type | Required | Rules |
|---|---|---:|---|
| `attributeId` | string | Yes when attributes exist | Must identify one configured attribute of the selected active product |
| `optionId` | string | Yes when attributes exist | Must identify one option in that attribute |
| `selectedImageId` | string | When a gallery image is selected | Must identify an image in the effective gallery for the submitted combination |

For a product with attributes, there must be exactly one selection for every
configured attribute. Duplicate, missing, extra, stale, or cross-product
identifiers are invalid. A product without attributes accepts no attribute
selections. The image ID refers to the customer's current main image; the
backend resolves its URL from the validated default or exact-combination
gallery.

The default option for each attribute is initially selected by the client and
can be replaced with one other valid option. If the selected combination has no
gallery, the default gallery is effective.

## Appointment customization snapshot

Appointments may include optional server-derived customization values. Each
entry contains:

| Field | Type | Required | Rules |
|---|---|---:|---|
| `attributeId` | string | Yes | ID from the validated product definition at booking |
| `attributeLabel` | string | Yes | Attribute label copied from that definition |
| `optionId` | string | Yes | Selected option ID |
| `optionLabel` | string | Yes | Option label copied from that definition |

The existing appointment field `productImageUrlSnapshot` stores the
server-resolved URL of the selected main image. The selection labels and image
URL do not alter price, duration, commission, availability, or status. Later
product edits do not change stored attribute snapshots or the URL. Physically
deleting the file may make that URL unavailable, as accepted in the
specification.

Historical appointments without customization snapshots remain valid. Existing
product image snapshots are interpreted as previously recorded and continue to
render while their URLs are available.

## Relationships and validation

```text
Tenant
  └── Product
       ├── CustomizationAttribute[]
       │    └── CustomizationOption[]
       ├── Default ProductImage[1..10]
       └── VariantGallery[0..N]
            ├── exact ProductCustomizationSelection[] combination
            └── ProductImage[1..10]

Appointment
  ├── ProductCustomizationSnapshot[]
  └── productImageUrlSnapshot (effective main image URL)
```

- Saving a product requires one to ten default images; legacy `imageUrl` can
  supply the first image for an existing product.
- Each configured attribute requires a non-empty label, at least two distinct
  options, and a default option ID belonging to that attribute.
- A variant gallery combination must include each configured attribute
  exactly once and use an option belonging to that attribute.
- Booking requires exactly one valid selected option for every configured
  attribute. The selected image ID must be present in the effective gallery.
- Product option labels, image URLs, and snapshots submitted by the client are
  not trusted; the backend resolves authoritative labels and image URL from
  current tenant-owned product/gallery records.
- Attribute/gallery edits affect future bookings. Existing appointment
  snapshots are not rewritten by product edits.
- Existing products/appointments without new fields remain readable and
  bookable according to existing rules.
