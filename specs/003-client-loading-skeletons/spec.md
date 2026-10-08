# Feature Specification: Client Loading Skeletons and Booking Flow Guidance

**Feature Branch**: `003-client-loading-skeletons`

**Created**: 2026-10-08

**Status**: Ready for Planning

**Input**: User-approved design in `docs/superpowers/specs/2026-10-08-client-skeleton-booking-components-design.md`

## User Scenarios & Testing

### User Story 1 - Understand client loading states (Priority: P1)

As a customer browsing the client application, I want loading feedback that resembles the content being fetched, so that I can understand which parts of the page are still loading without seeing generic “loading...” messages.

**Why this priority**: Discovery, catalog, and booking are the customer-facing path into the platform, and loading states occur throughout that path.

**Independent Test**: Keep each client screen's content request pending and verify a content-shaped placeholder appears; resolve or reject the request and verify the placeholder is replaced by the corresponding ready, empty, or error state.

**Acceptance Scenarios**:

1. **Given** company or product discovery is pending, **When** the customer views the discovery screen, **Then** product/store card placeholders appear without visible loading copy.
2. **Given** a company catalog is pending, **When** the customer views the catalog screen, **Then** service-card placeholders appear without visible loading copy.
3. **Given** booking details or appointment availability is pending, **When** the customer views the booking screen, **Then** service-summary and available-time placeholders appear in the relevant content areas.
4. **Given** a blocking operation or booking submission is pending, **When** the customer waits for its result, **Then** skeleton-based progress feedback appears instead of a visible loading label or spinner.
5. **Given** any loading placeholder is shown, **When** assistive technology inspects the page, **Then** decorative shapes are ignored and a concise status announcement is available.
6. **Given** a request fails or returns no results, **When** loading ends, **Then** the existing error or empty state appears and no loading placeholder remains.

---

### User Story 2 - Continue directly to customer details (Priority: P1)

As a customer who selected an available time, I want the customer-details step brought into view automatically, so that I can continue the booking without searching for the next step.

**Why this priority**: The selected time is the transition from availability selection to completing the booking request.

**Independent Test**: Select an available time and verify the customer-details section is brought into view once, without moving focus; repeat with reduced motion enabled and verify scrolling is immediate.

**Acceptance Scenarios**:

1. **Given** no time is selected, **When** the customer selects an available time, **Then** “2. SEUS DADOS” is revealed and brought into view.
2. **Given** the customer changes an already selected time, **When** the selection changes, **Then** the page does not trigger another automatic scroll.
3. **Given** the customer prefers reduced motion, **When** the customer selects the first available time, **Then** the details section is brought into view without animated scrolling.
4. **Given** the details section is brought into view, **When** scrolling completes, **Then** keyboard focus remains where it was.

---

### User Story 3 - Follow a clear booking flow (Priority: P2)

As a customer booking a service, I want service information, availability, my details, and the booking receipt to be presented as clear sections, so that I can understand where I am in the flow.

**Why this priority**: Clear separation improves the existing booking journey without changing its booking rules or data ownership.

**Independent Test**: Complete the booking flow and verify the service summary, time selection, customer details, and receipt remain available with their existing information and actions.

**Acceptance Scenarios**:

1. **Given** a booking is ready, **When** the customer views the page, **Then** service information and availability are presented in distinct sections.
2. **Given** the customer selected a time, **When** the details step appears, **Then** existing customer fields, validation, consent, and submission behavior are preserved.
3. **Given** a booking request succeeds, **When** the receipt appears, **Then** its appointment details and sharing/close actions remain available.

## Edge Cases

- Loading content resolves to an error or empty result; placeholders must be removed.
- A customer changes the date while availability is loading; the current availability behavior and its loading feedback remain coherent.
- A selected time is cleared after booking; the details section is no longer treated as a newly selected step until a time is selected again.
- The browser does not support the scrolling API or reduced-motion media query; the booking flow must still remain usable.
- Multiple global operations overlap; progress feedback must not report completion while an operation is still active.

## Requirements

### Functional Requirements

- **FR-001**: The client application MUST use content-shaped skeleton placeholders for pending discovery, catalog, booking-detail, and availability content.
- **FR-002**: The client application MUST use skeleton-based visible feedback for blocking operations and booking submission instead of visible loading/progress copy or a spinner.
- **FR-003**: Loading feedback MUST be removed when the operation resolves, fails, or reaches an empty result.
- **FR-004**: Loading feedback MUST retain an accessible status announcement without exposing decorative skeleton shapes to assistive technology.
- **FR-005**: The booking flow MUST bring the customer-details step into view on the first transition from no selected time to a selected time.
- **FR-006**: Automatic scrolling MUST respect reduced-motion preferences and MUST NOT move keyboard focus.
- **FR-007**: Existing booking validation, consent, error handling, receipt content, and service/availability data behavior MUST remain unchanged.
- **FR-008**: The booking flow MUST present the service summary, availability/time selection, customer details, and receipt as clearly separable sections.

### Key Entities

- **Loading state**: A pending client content request or blocking operation that determines which skeleton feedback is shown.
- **Selected appointment time**: The customer's current available time selection, which controls visibility and automatic scrolling to customer details.

## Success Criteria

### Measurable Outcomes

- **SC-001**: All client screen/content loading states show appropriate skeleton feedback and no visible generic loading/progress text.
- **SC-002**: Pending discovery, catalog, booking, and blocking-operation tests verify the appropriate skeletons are shown and removed when loading ends.
- **SC-003**: Selecting the first available time brings “2. SEUS DADOS” into view exactly once and does not change focus; reduced-motion mode uses non-animated scrolling.
- **SC-004**: Existing client booking, error, empty-state, and receipt tests continue to pass.

## Assumptions

- The feature applies only to the public client application; collaborator, backoffice, and backend behavior are out of scope.
- Existing empty/error messages and business behavior should remain unchanged.
- Existing skeleton primitives and the client's current test/build scripts are the preferred basis for implementation and validation.
