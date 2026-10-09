# Data Model: Client Loading Skeletons and Booking Flow Guidance

This feature adds no persisted entities, API fields, or domain models. It presents existing client state through loading placeholders and existing booking sections.

## Transient UI State

### Loading operation

- **Represents**: An existing pending content request or blocking operation.
- **Source**: Existing request/query state or `LoadingContext` operation tracking.
- **Presentation**: A skeleton layout appropriate to the pending content or action.
- **Lifecycle**: Exists only while the existing operation is pending; replaced by the existing success, empty, or error state when it completes.
- **Accessibility**: A concise hidden status announcement accompanies decorative shapes.

### Selected appointment time

- **Represents**: The customer's selected `AvailableSlot` start time in the current booking flow.
- **Source**: Existing booking-page state.
- **Presentation effect**: Controls visibility of customer details.
- **Transition behavior**: Only the empty-to-selected transition triggers automatic scrolling; clearing and selecting again constitutes a new transition.
- **Persistence**: None; remains in in-memory page state.

### Booking receipt

- **Represents**: The existing successful appointment request summary.
- **Source**: Existing booking-page state populated after successful submission.
- **Presentation effect**: Controls visibility of the receipt dialog.
- **Persistence**: No changes in this feature.
