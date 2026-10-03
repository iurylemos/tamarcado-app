# Research: SaaS Appointment Commerce Platform

**Date**: 2026-10-03
**Source**: User-provided platform document, feature specification, and official product
documentation reviewed during planning.

## Decisions

### 1. Preserve the specified Firebase and React/Vite direction

- **Decision**: Plan three React/TypeScript/Vite applications (`client`, `collaborator`,
  `backoffice`) and a trusted Firebase Functions backend. Use Firestore, Firebase
  Authentication, Firebase Hosting, Tailwind CSS, Vitest, and Testing Library as named in
  the source document.
- **Rationale**: These are explicit project constraints in the supplied platform document.
  The applications have distinct actor and permission boundaries; separate Hosting sites
  keep those boundaries clear while sharing project-level identity and backend resources.
- **Alternatives considered**: A single combined frontend was not selected because it
  increases the risk of mixing role-specific flows. Replacing Vite with a framework that has
  turnkey SSR support was not selected because the source document specifies Vite.

### 2. Use three Firebase Hosting sites and a dedicated public-page renderer

- **Decision**: Deploy each frontend to its own Hosting site/target. Keep collaborator and
  backoffice as static applications. Route public company/service pages to an HTML renderer
  through Hosting rewrites, implemented as a custom Vite-compatible SSR function. Keep trusted
  booking and administrative operations separate from rendering.
- **Rationale**: Hosting supports multisite deployments and rewrites to Functions. A static
  SPA fallback does not produce route-specific initial HTML. Firebase's framework-aware
  deployment paths document Next.js and Angular, not turnkey Vite SSR, so Vite requires a
  custom render/build integration. Prerendering is also viable if catalog changes can trigger
  regeneration, but the source document asks for dynamic SSR.
- **Alternatives considered**: Prerender public catalog pages; use a Firebase-supported SSR
  framework for the public app; or use Cloud Run for more runtime control. These change the
  supplied direction or add operational complexity.
- **Operational constraints**: Function rewrites are not CDN-cached by default. Public HTML
  may be cached with safe public cache headers; personalized or authenticated responses MUST
  NOT be shared-cached. Confirm rewrite precedence, SSR region, billing, and Hosting quotas
  during deployment planning.

### 3. Keep all Firestore collections at the root and scope tenant data explicitly

- **Decision**: Follow the source document's no-subcollections constraint. Every
  tenant-owned document carries a validated `tenantId`; queries and writes are always scoped
  to that tenant. Use server-issued Firebase Auth claims for the user's current tenant and
  role, and verify authorization again in trusted backend operations.
- **Rationale**: Firestore Rules are not query filters: a query is rejected if its potential
  result set could include unauthorized documents. Admin/server SDKs bypass Firestore
  Security Rules and require explicit backend authorization. A trusted tenant claim provides
  a compact identity context; it MUST be updated and refreshed when a user's membership
  changes.
- **Alternatives considered**: Tenant subcollections and membership-document lookups. The
  source explicitly prohibits subcollections; per-request document lookups add Rules
  access-call and read-cost constraints. If users later need simultaneous membership in
  multiple tenants, revisit the claim model before expanding that scope.
- **Public catalog**: Do not grant public reads to private service records that include
  commission or operational data. Publish a separate minimal public projection, or serve
  the same safe projection through a trusted read operation.

### 4. Protect appointment slots with deterministic reservations

- **Decision**: Use a Firestore transaction for each booking or edit. Convert the requested
  half-open time interval into deterministic five-minute reservation keys for the selected
  professional; atomically verify and claim every intersecting key while writing the
  appointment. Customer-facing booking intervals are configurable in multiples of five
  minutes, with a 15-minute default. Use the same transaction boundary to release old keys
  during an accepted reschedule.
- **Rationale**: A read-then-write outside an atomic transaction can accept simultaneous
  conflicting requests. A stable five-minute quantum ensures bookings with different
  configured start intervals still contend on the same documents. The 15-minute default
  and configurable business interval are declared assumptions in `spec.md`.
- **Alternatives considered**: A single per-professional/day lock is simpler but serializes
  unrelated bookings and can become a hot document. A query-only check is not sufficient as
  a conflict primitive. Appointment durations and selected start times must use the
  configured business interval.
- **Limitations**: Firestore transactions retry under contention, have finite limits, and
  must not perform messaging or other external side effects in the retryable callback.
  Create the appointment and reservation records atomically, then send notifications after
  commit. Surface conflict and retry-exhaustion outcomes explicitly.

### 5. Bridge WhatsApp verification to Firebase Auth through a trusted provider adapter

- **Decision**: Keep the WhatsApp OTP provider behind a server-side adapter. After that
  provider confirms a one-time code, the trusted backend maps the verified phone to a stable
  user identity and issues a Firebase custom token. Do not represent native Firebase Phone
  Authentication as WhatsApp verification.
- **Rationale**: Firebase's documented Phone Authentication flow uses SMS and does not
  document WhatsApp as a delivery channel. Firebase custom authentication supports a
  server-verified external identity. The specific WhatsApp provider remains a procurement
  and onboarding choice, not a reason to couple domain behavior to one vendor.
- **Alternatives considered**: Native Firebase SMS verification (does not meet the WhatsApp
  requirement); direct client verification (not trusted); or changing the authentication
  channel (would change the constitution and feature specification).
- **Messaging constraints**: Keep authentication OTP consent separate from appointment
  message opt-in. Capture and honor business-specific consent and opt-outs. Use approved
  templates when required outside the customer-service window, and treat delivery webhooks
  as authoritative for delivered/read/failed states. Plan business-specific sender
  ownership/onboarding; do not assume unrelated businesses can share one sender.
- **Decision still required before provider integration tasks**: Select a provider and
  confirm tenant onboarding, template approval, pricing, data-processing terms, and fallback
  behavior. The contract remains provider-neutral until then.

### 6. Make appointment transactions the financial source of truth

- **Decision**: Snapshot service name, price, commission type/value, and calculated commission
  on appointment creation. Count only completed appointments as sales and commission in the
  initial reporting design; exclude pending, confirmed, and cancelled appointments.
  Calculate percentage commission from the snapshotted price, round half-up to the nearest
  cent, and retain fixed commission as an amount in cents.
- **Rationale**: Historical reports must not change when catalog terms change. Completed
  appointments are the clearest auditable proxy for delivered services; the source document
  does not define status eligibility or rounding.
- **Alternatives considered**: Counting confirmed appointments or maintaining editable
  monthly totals. Counting only completed work avoids recognizing cancelled or not-yet-
  delivered appointments; manually maintained totals are not reproducible.
- **Reporting model**: Reports and exports derive from appointments. A monthly read model may
  optimize common views but MUST be rebuildable and MUST NOT replace the transaction source
  of truth. Show a collaborator ranking only when at least two collaborators have eligible
  transactions in the selected period.

### 7. Use business-local calendar rules and UTC appointment instants

- **Decision**: Store appointment instants in UTC; evaluate working hours, booking intervals,
  and month boundaries using the business's configured IANA timezone. Default new businesses
  to `America/Sao_Paulo`.
- **Rationale**: UTC instants support unambiguous ordering and conflict checks; business-local
  calendar rules ensure staff hours and monthly reports match the business's expectations.
- **Alternatives considered**: Storing local date/time without a timezone (ambiguous at
  offsets and calendar boundaries) or using a single browser timezone (inconsistent across
  users).

### 8. Keep shared domain rules framework-independent

- **Decision**: Use typed functional modules for shared status definitions, validation
  contracts, appointment/commission rules, and domain values. Keep presentation composition
  and role-specific behavior within each application.
- **Rationale**: This meets the source document's functional TypeScript direction and the
  constitution's requirements to separate presentation from business rules and avoid
  duplicated status/financial formulas. Prefer reusable functions over static-only utility
  classes, which add no domain value.
- **Alternatives considered**: Duplicate domain definitions in each frontend/backend (risks
  drift) or share UI/application modules across role boundaries (risks coupling).

## Sources

- [Firestore Rules conditions and document access](https://firebase.google.com/docs/firestore/security/rules-conditions)
- [Firestore Rules and queries](https://firebase.google.com/docs/firestore/security/rules-query)
- [Firestore server client libraries](https://firebase.google.com/docs/firestore/client/libraries#server_client_libraries)
- [Firebase custom claims](https://firebase.google.com/docs/auth/admin/custom-claims)
- [Firebase custom authentication](https://firebase.google.com/docs/auth/web/custom-auth)
- [Firebase custom tokens](https://firebase.google.com/docs/auth/admin/create-custom-tokens)
- [Firebase web phone authentication](https://firebase.google.com/docs/auth/web/phone-auth)
- [Firestore transactions and batched writes](https://firebase.google.com/docs/firestore/manage-data/transactions)
- [Firestore transaction contention and isolation](https://firebase.google.com/docs/firestore/transaction-data-contention)
- [Firestore data structure choices](https://firebase.google.com/docs/firestore/manage-data/structure-data)
- [Firebase Hosting multisites](https://firebase.google.com/docs/hosting/multisites)
- [Firebase Hosting deploy targets](https://firebase.google.com/docs/cli/targets)
- [Firebase Hosting rewrites](https://firebase.google.com/docs/hosting/full-config#rewrites)
- [Firebase Hosting with Cloud Functions](https://firebase.google.com/docs/hosting/functions)
- [Firebase Hosting cache management](https://firebase.google.com/docs/hosting/manage-cache)
- [Firebase Hosting framework support](https://firebase.google.com/docs/hosting/frameworks)
- [Firebase Functions locations](https://firebase.google.com/docs/functions/locations)
- [Vite static deployment](https://vite.dev/guide/static-deploy.html)
- [Google Search JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [WhatsApp authentication templates](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/authentication-templates/authentication-templates.md)
- [WhatsApp opt-in requirements](https://developers.facebook.com/documentation/business-messaging/whatsapp/getting-opt-in.md)
- [WhatsApp message delivery statuses](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages.md)
- [WhatsApp message sending and customer-service windows](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/send-messages)
- [WhatsApp Business Messaging Policy](https://business.whatsapp.com/policy)
