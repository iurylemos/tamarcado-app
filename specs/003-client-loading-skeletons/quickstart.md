# Quickstart: Validate Client Loading Skeletons and Booking Flow

## Prerequisites

- Node.js and npm versions supported by the repository.
- Dependencies installed from the repository root.

## Focused tests

From the repository root, run the affected client tests:

```powershell
Set-Location client
npm test -- src/pages/CompanyListPage.spec.tsx src/pages/CompanyCatalogPage.spec.tsx src/pages/BookingPage.spec.tsx src/components/organisms/BookingForm/BookingForm.spec.tsx src/contexts/LoadingContext.spec.tsx
```

Expected results:

- Pending discovery, catalog, booking, availability, global-operation, and submit states render their skeleton feedback.
- Loading skeletons disappear when their corresponding operation resolves or renders an error/empty state.
- Existing booking data, errors, validation, receipt, and consent behavior continue to pass.
- Selecting the first time brings customer details into view once without moving focus; reduced-motion mode uses immediate scrolling.

## Client type-check and production build

From the repository root:

```powershell
Set-Location client
npm run build
```

Expected result: TypeScript validation succeeds and Vite creates the production client build.
