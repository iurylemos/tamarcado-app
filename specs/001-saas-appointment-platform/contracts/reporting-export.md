# Reporting and Export Contract

## Boundary

Reports are tenant-scoped views over appointments. Collaborators may view only their
authorized professional scope; backoffice users may view the tenant's permitted business
scope. Every query uses the business's configured timezone.

## Report Request

**Input**:

- Reporting year and month.
- Optional service and collaborator filters supported by the current view.
- Caller identity and scope from trusted authentication context.

**Success**:

- The selected period and timezone.
- Sales and commission totals.
- Optional breakdown by service and collaborator.
- A top-three ranking only if at least three collaborators have eligible transactions in
  the period.
- An optional UTF-8 CSV export using the same filters and calculations.

## Calculation Rules

- Only completed appointments contribute to sales and commissions in the initial release.
- Use the appointment's snapshotted service price and commission terms, not current catalog
  values.
- Percentage commission is calculated from the snapshotted price and rounded half-up to
  cents; fixed commission uses the snapshotted cent amount.
- The period begins at local midnight on the first day of the selected month and ends at
  local midnight on the first day of the following month in the business timezone.
- Displayed totals, breakdowns, and exported rows MUST use the same eligibility and filter
  logic.
- The export contains no customer phone, message content, or unrelated personal information.
- Any monthly aggregate is a rebuildable projection; transactional appointments remain the
  source of truth.

## Error Outcomes

| Code | Meaning |
|---|---|
| `UNAUTHENTICATED` | No verified active identity |
| `FORBIDDEN` | Caller cannot access the requested report scope |
| `INVALID_PERIOD` | Unsupported year/month or invalid filter |
| `TEMPORARY_FAILURE` | Report or export could not be produced; no success-shaped empty result |

An empty report is a valid success only when the caller is authorized and the selected period
contains no eligible transactions.
