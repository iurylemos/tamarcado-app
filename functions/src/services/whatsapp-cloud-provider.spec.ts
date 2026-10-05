import { describe, expect, it, vi } from 'vitest';
import { createCloudApiProvider, readCloudApiConfig } from './whatsapp-provider.service';

const config = {
  accessToken: 'token',
  phoneNumberId: '123',
  apiVersion: 'v21.0',
  languageCode: 'pt_BR',
  baseUrl: 'https://graph.test',
};

describe('WhatsApp Cloud API provider', () => {
  it('reads configuration only when credentials exist', () => {
    expect(readCloudApiConfig({})).toBeNull();
    expect(
      readCloudApiConfig({ WHATSAPP_ACCESS_TOKEN: 't', WHATSAPP_PHONE_NUMBER_ID: '1' }),
    ).toMatchObject({ apiVersion: 'v21.0', languageCode: 'pt_BR' });
  });

  it('posts an approved template to the Graph API', async () => {
    const fetchMock = vi.fn(async () => Response.json({ messages: [{ id: 'wamid.1' }] }));
    const provider = createCloudApiProvider(config, fetchMock);
    const result = await provider.sendTemplate({
      phoneE164: '+5511999990001',
      templateName: 'appointment_customer_update',
      components: [{ type: 'body', parameters: [{ type: 'text', text: 'Oi' }] }],
    });
    expect(result.providerMessageId).toBe('wamid.1');
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://graph.test/v21.0/123/messages');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer token');
    const body = JSON.parse(init.body as string);
    expect(body.to).toBe('5511999990001');
    expect(body.template.name).toBe('appointment_customer_update');
  });

  it('maps provider rejections to a provider error', async () => {
    const provider = createCloudApiProvider(
      config,
      async () => Response.json({ error: { code: 131026 } }, { status: 400 }),
    );
    await expect(
      provider.sendTemplate({ phoneE164: '+5511999990001', templateName: 'x', components: [] }),
    ).rejects.toMatchObject({ code: 'META_131026' });
  });
});
