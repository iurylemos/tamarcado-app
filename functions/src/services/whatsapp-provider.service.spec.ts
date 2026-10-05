import { afterEach, describe, expect, it, vi } from 'vitest';
import { readTwilioConfig, resolveWhatsAppProvider } from './whatsapp-provider.service';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Twilio WhatsApp provider configuration', () => {
  it('requires only the Twilio credentials and WhatsApp sender', () => {
    expect(readTwilioConfig({})).toBeNull();
    expect(
      readTwilioConfig({
        TWILIO_ACCOUNT_SID: 'AC123',
        TWILIO_AUTH_TOKEN: 'token',
        TWILIO_WHATSAPP_FROM: 'whatsapp:+14155238886',
      }),
    ).toEqual({
      accountSid: 'AC123',
      authToken: 'token',
      provider: { from: 'whatsapp:+14155238886' },
    });
  });

  it('accepts optional delivery callbacks and collaborator app links', () => {
    expect(
      readTwilioConfig({
        TWILIO_ACCOUNT_SID: 'AC123',
        TWILIO_AUTH_TOKEN: 'token',
        TWILIO_WHATSAPP_FROM: 'whatsapp:+14155238886',
        TWILIO_WHATSAPP_STATUS_CALLBACK_URL: 'https://example.test/providerWebhook',
        COLLABORATOR_APP_URL: 'https://collaborator.example',
      })?.provider,
    ).toEqual({
      from: 'whatsapp:+14155238886',
      statusCallbackUrl: 'https://example.test/providerWebhook',
      collaboratorAppUrl: 'https://collaborator.example',
    });
  });

  it('selects Twilio with only the required Sandbox settings', () => {
    vi.stubEnv('WHATSAPP_PROVIDER', 'twilio');
    vi.stubEnv('TWILIO_ACCOUNT_SID', 'AC123');
    vi.stubEnv('TWILIO_AUTH_TOKEN', 'token');
    vi.stubEnv('TWILIO_WHATSAPP_FROM', 'whatsapp:+14155238886');

    expect(resolveWhatsAppProvider().name).toBe('twilio');
  });
});
