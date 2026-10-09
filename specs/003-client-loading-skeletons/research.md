# Research: Client Loading Skeletons and Booking Flow Guidance

## Existing Loading Patterns

**Decision**: Extend the current skeleton primitives rather than introduce another loading library or parallel visual system.

**Evidence**: `client/src/components/atoms/Skeleton/Skeleton.tsx` and `client/src/components/molecules/SkeletonCard/SkeletonCard.tsx` already provide animated, reduced-motion-aware shapes and card variants. Discovery and catalog templates already render product, store, and service card skeletons. Booking already renders booking-summary and time-slot skeleton cards.

**Rationale**: Reuse keeps loading appearance consistent and preserves existing tests and styling conventions.

**Alternatives considered**:

- Add a third-party skeleton package: rejected because the current primitives cover the same purpose and no dependency is needed.
- Replace existing card skeletons with a separate global loading component: rejected because it would duplicate existing skeleton responsibilities.

## Accessible Progress Feedback

**Decision**: Keep a concise visually hidden live-region message alongside decorative skeleton shapes.

**Evidence**: Existing templates use `role="status"` and the `.skeleton-status` visually-hidden style. Skeleton primitives use `aria-hidden="true"`. The shared loading context currently provides a visible overlay with a progress message and spinner.

**Rationale**: The user-facing visual treatment can change without removing nonvisual progress feedback for assistive-technology users.

**Alternatives considered**:

- Remove all status announcements together with visible text: rejected because it would regress accessibility.
- Make every skeleton shape individually announce itself: rejected because decorative detail should not add noisy or ambiguous semantics.

## Booking Template Boundaries

**Decision**: Keep data fetching/state in `BookingPage` and split only the booking template's presentational sections into focused organisms.

**Evidence**: `BookingPage` owns catalog, availability, selected time, submission, and receipt state. `BookingTemplate` currently receives those values and callbacks but also contains the service summary, date/professional/time controls, customer form section, and receipt dialog in one file.

**Rationale**: Extracting along visible workflow boundaries addresses the user's concern while preserving the existing page/template state contract.

**Alternatives considered**:

- Move data fetching into the new organisms: rejected because it would blur existing page ownership and duplicate service dependencies.
- Leave all sections nested in `BookingTemplate`: rejected because the current file combines multiple independently understandable presentation responsibilities.

## Automatic Scroll Behavior

**Decision**: Scroll the customer-details region into view only when the selection changes from empty to populated; use `auto` when reduced motion is preferred.

**Evidence**: The current template already tracks the previous selection and calls `scrollIntoView` without focusing the form. Existing `BookingPage.spec.tsx` verifies the first-selection scroll and unchanged focus.

**Rationale**: Preserve intended behavior while keeping the scroll target in the section that is conditionally revealed. Tests can validate the observable behavior without coupling to component internals.

**Alternatives considered**:

- Scroll on every selected-time change: rejected because it can interrupt customers while changing an existing choice.
- Focus the first form field: rejected because the approved design explicitly preserves current focus behavior.

## Validation Tooling

**Decision**: Use the existing client Vitest/Testing Library setup and `npm run build`.

**Evidence**: `client/package.json` defines `test` as `vitest run` and `build` as `tsc --noEmit && vite build`; the repository already has focused page and component tests.

**Rationale**: Targeted existing tests and the existing build/type-check validate behavior without introducing tooling.

**Alternatives considered**:

- Add a new browser automation or visual regression dependency: rejected as unnecessary for the specified state and scroll assertions.
