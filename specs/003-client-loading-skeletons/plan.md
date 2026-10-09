# Implementation Plan: Client Loading Skeletons and Booking Flow Guidance

**Branch**: `003-client-loading-skeletons` | **Date**: 2026-10-08 | **Spec**:
[spec.md](./spec.md)

**Input**: Approved feature specification from `specs/003-client-loading-skeletons/spec.md`

## Summary

Extend the existing skeleton system to every visible client loading state, including the shared operation overlay and booking submission control. Keep accessible status announcements while making decorative skeletons the visual progress feedback. Reduce the booking template's responsibilities by extracting its summary, availability, customer-details, and receipt sections into focused organisms. Preserve existing booking state ownership and behavior, and scroll to customer details on the first time selection while honoring reduced motion.

## Technical Context

**Language/Version**: TypeScript 6, React 19

**Primary Dependencies**: Existing React, Framer Motion, Vitest, and Testing Library dependencies; no new dependencies.

**Storage**: N/A; all new state is transient UI state.

**Testing**: Existing Vitest and Testing Library tests in `client/src`; existing TypeScript check and Vite build through `client/package.json`.

**Target Platform**: Responsive client web application in modern browsers.

**Project Type**: React frontend application.

**Performance Goals**: Do not add network requests or delay content display; skeletons render only while their existing operation is pending.

**Constraints**:

- Keep client UI components and styles within `client/`; do not change collaborator, backoffice, backend, or shared domain behavior.
- Follow the existing Atomic Design component structure and reuse existing skeleton primitives.
- Preserve booking data ownership in `BookingPage`, current accessible form behavior, validation, and loading/error semantics.
- Respect reduced-motion preferences for skeleton animation and automatic scrolling.

**Scale/Scope**: Three existing customer-facing screen templates, the shared loading context, the booking form, and the booking template's four presentation sections.

## Constitution Check

### Pre-Design Gate: PASS

- **VI. Separation of Application Boundaries**: All UI changes stay within the client application and do not move presentation code into shared domain or other frontends.
- **VII. User Experience and Accessibility**: Loading, error, and empty states remain explicit; skeletons retain a semantic status announcement, and auto-scroll does not move focus or ignore reduced-motion preferences.
- **VIII. Maintainability and Simplicity**: Existing skeleton primitives are reused, and the large booking template is divided along its existing user-facing sections without changing page-level state ownership.

No constitutional violations or exceptions are requested.

## Design Decisions

1. **Reuse the existing skeleton primitives.** Keep `Skeleton` and `SkeletonCard` as the visual foundation. Add only the shapes or layout styles needed for the operation overlay, submit button, or next-date search.
2. **Keep loading announcements but remove visible loading copy.** Skeleton shapes remain decorative and hidden from assistive technology. Their containing region retains a concise visually hidden status announcement.
3. **Extract focused booking organisms.** Create separate organisms for service summary, availability/time selection, customer details, and receipt. `BookingPage` continues to own requests and state; `BookingTemplate` composes the view.
4. **Keep scrolling with the customer-details section.** Trigger scrolling only when the selected time transitions from empty to populated, use immediate behavior for reduced motion, and do not focus the form.
5. **Do not add external UI contracts.** The changes affect internal client components only; component props are the relevant internal boundaries.

## Project Structure

### Documentation (this feature)

```text
specs/003-client-loading-skeletons/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── spec.md
```

No `contracts/` directory is required because the feature introduces no external API or cross-application interface.

### Source Code

```text
client/src/
├── components/
│   ├── atoms/Skeleton/Skeleton.tsx
│   ├── molecules/SkeletonCard/SkeletonCard.tsx
│   ├── organisms/
│   │   ├── BookingServiceSummary/BookingServiceSummary.tsx
│   │   ├── BookingAvailability/BookingAvailability.tsx
│   │   ├── BookingCustomerDetails/BookingCustomerDetails.tsx
│   │   ├── BookingReceiptDialog/BookingReceiptDialog.tsx
│   │   └── BookingForm/BookingForm.tsx
│   └── templates/
│       ├── BookingTemplate/BookingTemplate.tsx
│       ├── CompanyCatalogTemplate/CompanyCatalogTemplate.tsx
│       └── CompanyListTemplate/CompanyListTemplate.tsx
├── contexts/LoadingContext.tsx
├── pages/
│   ├── BookingPage.spec.tsx
│   ├── CompanyCatalogPage.spec.tsx
│   └── CompanyListPage.spec.tsx
└── styles/index.css
```

The booking form and shared loading context receive focused tests in their existing or colocated test paths.

**Structure Decision**: Use the existing client Atomic Design layout. New booking sections are organisms because they each encapsulate a distinct booking-flow section and its presentation behavior.

## Validation Strategy

- Assert that discovery, catalog, booking details, availability, next-date search, global operation feedback, and booking submission show skeletons while pending.
- Assert that visible loading copy/spinners are absent while visually hidden status announcements remain available.
- Assert that skeletons are removed when data resolves, errors, or empty results are shown.
- Assert the booking sections preserve their labels and current callbacks/content.
- Assert first time selection scrolls details exactly once without changing focus, and reduced-motion mode requests immediate scrolling.
- Run focused client Vitest tests, then the client TypeScript/Vite build.

## Constitution Check (Post-Design): PASS

- The design remains within the client application and preserves the platform's domain boundaries.
- Loading and scrolling states provide explicit accessible feedback without changing booking flow behavior.
- The component extraction follows current project conventions and avoids new dependencies or new domain abstractions.

## Complexity Tracking

No constitution violations requiring justification.
