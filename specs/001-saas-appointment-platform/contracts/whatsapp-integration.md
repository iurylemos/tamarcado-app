# WhatsApp Verification and Messaging Contract

## Boundary

The WhatsApp provider is an external integration called only by trusted backend operations.
The integration is provider-neutral until a provider is selected. Provider credentials and
webhook secrets are never sent to a browser or stored in ordinary business documents.

## Phone Verification

### Start challenge

**Input**: Phone number and requested authentication context.

**Success**: An opaque challenge reference and expiry suitable for the verification flow.

**Rules**:

- Normalize and validate the phone number before calling the provider.
- Apply rate limits and prevent challenge replay.
- Make clear which phone and WhatsApp channel will receive the authentication code.
- Store challenge secrets and provider references only in trusted server-managed storage.

### Verify challenge

**Input**: Challenge reference and submitted one-time code.

**Success**: A verified identity result consumed by the authentication operation, which may
then issue a Firebase custom token for an active authorized user.

**Rules**:

- Provider confirmation is the evidence of phone control; a client assertion or profile
  phone field alone is not verification.
- Invalid, expired, repeated, or rate-limited attempts are rejected.
- Phone verification MUST NOT imply opt-in to appointment or promotional messages.

## Appointment Messaging

**Input**: Tenant-owned connection, opted-in contact, message purpose, and the minimum
appointment context needed for the approved message.

**Success**: Provider message reference and initial send state. Later provider callbacks
update the stored state to `sent`, `delivered`, `read`, or `failed`.

**Rules**:

- Check business-specific consent and opt-out state immediately before sending.
- Use an approved template when the provider's customer-service window or policy requires it.
- Keep messages transactional and avoid sensitive service details unless reviewed and
  necessary.
- A provider acceptance response is not proof of delivery; delivery webhooks are authoritative.
- Verify webhook authenticity and process duplicate or out-of-order events idempotently.
- A send failure remains visible and MUST NOT confirm, cancel, or otherwise mutate an
  appointment.

## Provider Failure Outcomes

| Code | Meaning |
|---|---|
| `CONSENT_REQUIRED` | No current valid opt-in for the requested message |
| `PROVIDER_UNAVAILABLE` | Provider cannot accept the operation |
| `INVALID_DESTINATION` | Phone cannot receive messages through the configured channel |
| `TEMPLATE_NOT_APPROVED` | Required business/template configuration is unavailable |
| `DELIVERY_FAILED` | Provider reports a terminal message failure |

Provider response text and secrets are not exposed to users or written to application logs.
