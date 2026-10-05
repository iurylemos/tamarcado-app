---
name: whatsapp-twilio
description: Migrate the existing WhatsApp provider from Meta Cloud API to Twilio without changing business logic.
---

# WhatsApp Twilio Migration

## Goal

Replace the existing official WhatsApp/Meta provider with Twilio.

## Rules

- Inspect the existing WhatsAppProvider before changing code.
- Preserve the existing provider interface whenever possible.
- Do not modify appointment/business logic.
- Do not rewrite consumers of WhatsAppProvider unnecessarily.
- Keep Twilio-specific code isolated in the provider.
- Keep credentials in environment variables/secrets.
- Remove Meta-specific dependencies only when no longer required.
- Preserve existing error handling conventions.
- Preserve multi-tenant isolation.

## Testing

Use TDD.

Before implementation:

1. Inspect existing WhatsApp provider tests.
2. Add/update tests for the Twilio provider.
3. Mock Twilio API calls.
4. Test success and failure scenarios.
5. Run relevant tests before and after implementation.

## Migration

The expected architecture is:

Business logic
↓
WhatsAppProvider
↓
TwilioProvider
↓
Twilio WhatsApp API

Do not couple business logic directly to Twilio.
