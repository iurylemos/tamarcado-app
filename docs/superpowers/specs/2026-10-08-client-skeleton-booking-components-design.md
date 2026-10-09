# Client Loading Skeletons and Booking Components

## Goal

Give every client screen consistent skeleton-based loading feedback and make the booking flow easier to understand and maintain. Selecting an available appointment time should guide the customer directly to the customer-details step.

## Scope

- Replace visible loading/progress copy throughout `client/src` with skeleton-based feedback, including initial screen loads, availability loading, the global loading overlay, and the booking submit control.
- Retain concise, visually hidden live-region status text where needed so assistive-technology users still receive loading updates.
- Reuse the existing `Skeleton` and `SkeletonCard` components and existing skeleton styles; add focused variants or layout styles only where current skeletons do not fit.
- Keep existing error and empty states unchanged.
- Split the booking ready view into focused, colocated components for the service summary, availability/time selection, customer details, and receipt dialog. `BookingTemplate` remains responsible for composing these sections and mapping the current booking state to the view.
- On the first transition from no selected time to a selected time, scroll the customer-details section into view. Honor the reduced-motion preference and avoid moving focus.

## User experience

- Discovery, catalog, and booking screens show card-shaped placeholders that match the content being loaded instead of visible “Carregando...” messages.
- Loading available time slots uses time-card skeletons; loading booking details uses a booking-summary skeleton.
- Blocking app-level operations and booking submission use skeleton placeholders rather than visible progress labels or a spinner. Existing operation/error handling and disabled states remain intact.
- Selecting a time reveals “2. SEUS DADOS” and smoothly brings that section into view, using an immediate scroll when reduced motion is preferred.
- Errors, empty results, and successful booking receipts keep their current content and behavior.

## Component boundaries and data flow

`BookingPage` continues to own data fetching and booking state. `BookingTemplate` continues to receive that state and callbacks through its existing props boundary. The ready-state presentation is divided into small components with explicit props:

- Service summary: catalog business and selected product.
- Availability and time selection: date, professionals, slots, loading state, and selection callbacks.
- Customer details: selected-time context, booking form state callbacks, and submission status.
- Receipt dialog: receipt data and sharing/close callbacks.

The time-selection component reports selection through the existing callback. The customer-details region remains mounted conditionally from the selected time and owns the scroll target, keeping scrolling tied to the visible section rather than to unrelated page content.

## Accessibility and motion

- Decorative skeleton shapes are hidden from the accessibility tree.
- Loading containers expose a concise `role="status"`/live-region announcement without displaying redundant loading copy.
- Skeleton motion respects `prefers-reduced-motion`.
- Automatic scrolling does not focus form controls and respects `prefers-reduced-motion`.

## Validation

- Update focused page/component tests to assert that loading states render skeletons without visible loading labels.
- Verify the global operation feedback and submit control show skeletons while pending and restore their normal states when complete.
- Verify booking sections render with their existing labels/content and that selecting the first available time scrolls the details section once without moving focus.
- Run the relevant client tests and the existing client build/type-check.

## Out of scope

- Changing loading behavior in server/admin apps or shared backend flows.
- Changing booking validation, API behavior, error messages, empty states, or receipt content.
- Replacing the current booking route or data-fetching ownership model.
