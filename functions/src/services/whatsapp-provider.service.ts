import { randomUUID } from 'node:crypto';
import { collections } from '../config/collections';
import { firestore } from './firestore.service';
import {
  WhatsAppProviderError,
  type RichTemplateRequest,
  type TemplateMessageRequest,
  type WhatsAppProvider,
} from './whatsapp-provider.interface';
import type { WhatsAppSendTemplate } from '../interfaces/whatsapp.interface';

const notConfiguredProvider: WhatsAppProvider = {
  name: 'not-configured',
  async sendTemplateMessage() {
    throw new WhatsAppProviderError('NOT_CONFIGURED', 'O provedor de WhatsApp não está configurado.');
  },
  async sendTemplate() {
    throw new WhatsAppProviderError('NOT_CONFIGURED', 'O provedor de WhatsApp não está configurado.');
  },
};

// Local-only double. It records deliveries in an outbox instead of calling a real provider,
// and rejects phones ending in 0666 so failure paths can be exercised.
const emulatorTestDouble: WhatsAppProvider = {
  name: 'emulator-test-double',
  async sendTemplateMessage(request: TemplateMessageRequest): Promise<WhatsAppSendTemplate> {
    if (request.phoneE164.endsWith('0666')) {
      throw new WhatsAppProviderError('REJECTED', 'Número rejeitado pelo provedor de teste.');
    }
    const providerMessageId = `test-${randomUUID()}`;
    await firestore.collection(collections.providerOutbox).doc(providerMessageId).set({
      kind: 'message',
      phoneE164: request.phoneE164,
      templateCategory: request.templateCategory,
      content: request.content,
      createdAt: Date.now(),
    });
    return { providerMessageId };
  },
  async sendTemplate(request: RichTemplateRequest): Promise<WhatsAppSendTemplate> {
    if (request.phoneE164.endsWith('0666')) {
      throw new WhatsAppProviderError('REJECTED', 'Número rejeitado pelo provedor de teste.');
    }
    const providerMessageId = `test-${randomUUID()}`;
    await firestore.collection(collections.providerOutbox).doc(providerMessageId).set({
      kind: 'template',
      phoneE164: request.phoneE164,
      templateName: request.templateName,
      components: request.components,
      createdAt: Date.now(),
    });
    return { providerMessageId };
  },
};

export interface CloudApiConfig {
  accessToken: string;
  phoneNumberId: string;
  apiVersion: string;
  languageCode: string;
  baseUrl: string;
}

export function readCloudApiConfig(env: NodeJS.ProcessEnv = process.env): CloudApiConfig | null {
  const accessToken = env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID;
  if (!accessToken || !phoneNumberId) return null;
  return {
    accessToken,
    phoneNumberId,
    apiVersion: env.WHATSAPP_API_VERSION || 'v21.0',
    languageCode: env.WHATSAPP_TEMPLATE_LANGUAGE || 'pt_BR',
    baseUrl: env.WHATSAPP_API_BASE_URL || 'https://graph.facebook.com',
  };
}

type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

// Official WhatsApp Business Cloud API (Meta). Only pre-approved templates are sent.
export function createCloudApiProvider(
  config: CloudApiConfig,
  fetchImpl: FetchLike = fetch,
): WhatsAppProvider {
  async function post(body: Record<string, unknown>): Promise<WhatsAppSendTemplate> {
    let response: Response;
    try {
      response = await fetchImpl(
        `${config.baseUrl}/${config.apiVersion}/${config.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ messaging_product: 'whatsapp', ...body }),
        },
      );
    } catch {
      throw new WhatsAppProviderError('NETWORK_ERROR', 'Não foi possível contatar o WhatsApp.');
    }
    const payload = (await response.json().catch(() => ({}))) as {
      messages?: Array<{ id?: string }>;
      error?: { code?: number };
    };
    const providerMessageId = payload.messages?.[0]?.id;
    if (!response.ok || !providerMessageId) {
      throw new WhatsAppProviderError(
        payload.error?.code ? `META_${payload.error.code}` : 'REJECTED',
        'O WhatsApp recusou a mensagem.',
      );
    }
    return { providerMessageId };
  }

  return {
    name: 'whatsapp-cloud-api',
    sendTemplate: (request) =>
      post({
        to: request.phoneE164.replace(/^\+/, ''),
        type: 'template',
        template: {
          name: request.templateName,
          language: { code: config.languageCode },
          components: request.components,
        },
      }),
    sendTemplateMessage: (request) =>
      post({
        to: request.phoneE164.replace(/^\+/, ''),
        type: 'template',
        template: {
          name: request.templateCategory,
          language: { code: config.languageCode },
          components: [{ type: 'body', parameters: [{ type: 'text', text: request.content }] }],
        },
      }),
  };
}

// Provider selection is deployment configuration (WHATSAPP_PROVIDER). Credentials are read from
// server-side environment/secrets only and never returned to clients.
export function resolveWhatsAppProvider(
  selected: string | undefined = process.env.WHATSAPP_PROVIDER,
): WhatsAppProvider {
  if (selected === 'emulator-test-double' && process.env.FUNCTIONS_EMULATOR === 'true') {
    return emulatorTestDouble;
  }
  if (selected === 'whatsapp-cloud-api') {
    const config = readCloudApiConfig();
    if (config) return createCloudApiProvider(config);
  }
  return notConfiguredProvider;
}

export const whatsappProvider: WhatsAppProvider = {
  name: 'dynamic',
  sendTemplateMessage: (request: TemplateMessageRequest): Promise<WhatsAppSendTemplate> =>
    resolveWhatsAppProvider().sendTemplateMessage(request),
  sendTemplate: (request: RichTemplateRequest): Promise<WhatsAppSendTemplate> =>
    resolveWhatsAppProvider().sendTemplate(request),
};
