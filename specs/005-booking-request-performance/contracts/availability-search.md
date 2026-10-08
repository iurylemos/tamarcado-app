# Availability Search Contract

## Operation

Search for available appointment times beginning on a selected business-local date, automatically returning the earliest date with slots in the supported window.

## Request

| Field | Type | Required | Meaning |
|---|---|---:|---|
| `businessSlug` | string | Yes | Public business identifier |
| `productId` | string | Yes | Service identifier |
| `date` | `YYYY-MM-DD` | Yes | First date in the search window, in the business timezone |

The server evaluates the requested date and the following 30 calendar dates. The caller cannot extend this limit.

## Success

```json
{
  "date": "2030-02-05",
  "slots": [
    {
      "startsAt": "2030-02-05T12:00:00.000Z",
      "endsAt": "2030-02-05T14:00:00.000Z",
      "professionalId": "professional-id",
      "professionalName": "Professional Name"
    }
  ]
}
```

`date` is the earliest date with available times; `slots` contains all available professionals' slots for that date, ordered by start time. When no date in the window has slots, return `{"date": null, "slots": []}`.

If `date` differs from the selected date, the client selects the returned date and displays its slots. A new customer-selected date starts a new bounded search.

## Rules

- Apply the existing business-local timezone, service duration, booking interval, working hours, blocked-period, appointment, reservation, and eligibility rules.
- Return only active professionals eligible for the selected service and business.
- Availability remains advisory; appointment creation revalidates the chosen time and atomically reserves it.
- Preserve the existing single-date `listAvailability` callable and its response contract for compatibility.
- Preserve existing public error outcomes for invalid input, unavailable business/service, and temporary request failures.

## Privacy

Availability results contain only public slot and professional information. Search timing measurements must not include customer contact data.
