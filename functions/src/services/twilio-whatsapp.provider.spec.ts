import { describe, expect, it, vi } from 'vitest';
import type { RichTemplateRequest } from './whatsapp-provider.interface';
import { createTwilioWhatsAppProvider } from './twilio-whatsapp.provider';

const config = {
  from: 'whatsapp:+14155238886',
  collaboratorAppUrl: 'https://collaborator.example',
  statusCallbackUrl: 'https://example.test/providerWebhook',
};

describe('Twilio WhatsApp provider', () => {
  it('sends a WhatsApp message as simple text without a Content SID', async () => {
    const createMessage = vi.fn(async () => ({ sid: 'SM123' }));
    const provider = createTwilioWhatsAppProvider({ messages: { create: createMessage } }, config);

    await expect(
      provider.sendTemplateMessage({
        phoneE164: '+5511999990001',
        templateCategory: 'appointment_reminder',
        content: 'Seu horário é às 15h',
      }),
    ).resolves.toEqual({ providerMessageId: 'SM123' });

    expect(createMessage).toHaveBeenCalledWith({
      from: 'whatsapp:+14155238886',
      to: 'whatsapp:+5511999990001',
      body: 'Seu horário é às 15h',
      statusCallback: 'https://example.test/providerWebhook',
    });
  });

  it('converts a rich customer template into readable text and omits its image', async () => {
    const createMessage = vi.fn(async () => ({ sid: 'SMcustomer' }));
    const provider = createTwilioWhatsAppProvider({ messages: { create: createMessage } }, config);
    const request: RichTemplateRequest = {
      phoneE164: '+5511999990001',
      templateName: 'appointment_customer_update',
      components: [
        {
          type: 'header',
          parameters: [{ type: 'image', image: { link: 'https://img.test/a.jpg' } }],
        },
        {
          type: 'body',
          parameters: [
            { type: 'text', text: 'Seu agendamento foi confirmado' },
            { type: 'text', text: 'Maria' },
            { type: 'text', text: 'Corte' },
          ],
        },
      ],
    };

    await provider.sendTemplate(request);

    expect(createMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        body: 'Seu agendamento foi confirmado\nMaria\nCorte',
      }),
    );
  });

  it('includes an app link for collaborators and does not send unsupported quick-reply payloads', async () => {
    const createMessage = vi.fn(async () => ({ sid: 'SMcollaborator' }));
    const provider = createTwilioWhatsAppProvider({ messages: { create: createMessage } }, config);

    await provider.sendTemplate({
      phoneE164: '+5511999990001',
      templateName: 'appointment_collaborator_request',
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: 'Maria' },
            { type: 'text', text: 'Design' },
          ],
        },
        {
          type: 'button',
          sub_type: 'quick_reply',
          index: '0',
          parameters: [{ type: 'payload', payload: 'accept:appointment-1' }],
        },
        {
          type: 'button',
          sub_type: 'url',
          index: '1',
          parameters: [{ type: 'text', text: 'appointment-1' }],
        },
      ],
    });

    expect(createMessage).toHaveBeenCalledWith({
      from: 'whatsapp:+14155238886',
      to: 'whatsapp:+5511999990001',
      body: [
        'Maria',
        'Design',
        'Acesse seu painel para responder:',
        'https://collaborator.example/appointments/appointment-1',
      ].join('\n'),
      statusCallback: 'https://example.test/providerWebhook',
    });
  });

  it('registers the configured delivery-status callback URL', async () => {
    const createMessage = vi.fn(async () => ({ sid: 'SMcallback' }));
    const provider = createTwilioWhatsAppProvider({ messages: { create: createMessage } }, config);

    await provider.sendTemplateMessage({
      phoneE164: '+5511999990001',
      templateCategory: 'appointment_reminder',
      content: 'Lembrete',
    });

    expect(createMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCallback: 'https://example.test/providerWebhook',
      }),
    );
  });

  it('surfaces provider failures without exposing Twilio response details', async () => {
    const createMessage = vi.fn(async () => {
      throw new Error('private provider response');
    });
    const provider = createTwilioWhatsAppProvider({ messages: { create: createMessage } }, config);

    await expect(
      provider.sendTemplateMessage({
        phoneE164: '+5511999990001',
        templateCategory: 'appointment_reminder',
        content: 'Lembrete',
      }),
    ).rejects.toMatchObject({
      name: 'WhatsAppProviderError',
      code: 'PROVIDER_ERROR',
      message: 'Twilio could not send the WhatsApp message.',
    });
  });
});
