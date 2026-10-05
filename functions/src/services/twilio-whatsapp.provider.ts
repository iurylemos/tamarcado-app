import {
  WhatsAppProviderError,
  type RichTemplateRequest,
  type TemplateMessageRequest,
  type WhatsAppProvider,
} from './whatsapp-provider.interface';

interface TwilioMessageClient {
  messages: {
    create(options: {
      from: string;
      to: string;
      body: string;
      statusCallback?: string;
    }): Promise<{ sid: string }>;
  };
}

export interface TwilioWhatsAppProviderConfig {
  from: string;
  collaboratorAppUrl?: string;
  statusCallbackUrl?: string;
}

function plainText(request: RichTemplateRequest, collaboratorAppUrl?: string): string {
  const body = request.components
    .filter((component) => component.type === 'body')
    .flatMap((component) =>
      component.parameters.flatMap((parameter) =>
        parameter.type === 'text' ? [parameter.text] : [],
      ),
    );
  const urlButton = request.components.find(
    (component) => component.type === 'button' && component.sub_type === 'url',
  );
  const appointmentId = urlButton?.parameters.find((parameter) => parameter.type === 'text')?.text;

  if (collaboratorAppUrl && appointmentId) {
    const baseUrl = collaboratorAppUrl.replace(/\/+$/, '');
    body.push(
      'Acesse seu painel para responder:',
      `${baseUrl}/appointments/${encodeURIComponent(appointmentId)}`,
    );
  }

  return body.join('\n').trim();
}

export function createTwilioWhatsAppProvider(
  client: TwilioMessageClient,
  config: TwilioWhatsAppProviderConfig,
): WhatsAppProvider {
  async function sendMessage(phoneE164: string, body: string): Promise<string> {
    if (!body.trim()) {
      throw new WhatsAppProviderError(
        'INVALID_MESSAGE',
        'A mensagem do WhatsApp não pode estar vazia.',
      );
    }

    let message: { sid: string };
    try {
      message = await client.messages.create({
        from: config.from,
        to: `whatsapp:${phoneE164}`,
        body,
        ...(config.statusCallbackUrl ? { statusCallback: config.statusCallbackUrl } : {}),
      });
    } catch {
      throw new WhatsAppProviderError(
        'PROVIDER_ERROR',
        'Twilio could not send the WhatsApp message.',
      );
    }

    if (!message.sid) {
      throw new WhatsAppProviderError('PROVIDER_ERROR', 'Twilio returned no message reference.');
    }
    return message.sid;
  }

  return {
    name: 'twilio',
    async sendTemplateMessage(request: TemplateMessageRequest) {
      const providerMessageId = await sendMessage(request.phoneE164, request.content);
      return { providerMessageId };
    },
    async sendTemplate(request: RichTemplateRequest) {
      const providerMessageId = await sendMessage(
        request.phoneE164,
        plainText(request, config.collaboratorAppUrl),
      );
      return { providerMessageId };
    },
  };
}
