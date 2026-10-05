import { randomUUID } from 'node:crypto';
import twilio from 'twilio';
import { collections } from '../config/collections';
import { firestore } from './firestore.service';
import type { WhatsAppSendTemplate } from '../interfaces/whatsapp.interface';
import {
  WhatsAppProviderError,
  type RichTemplateRequest,
  type TemplateMessageRequest,
  type WhatsAppProvider,
} from './whatsapp-provider.interface';
import {
  createTwilioWhatsAppProvider,
  type TwilioWhatsAppProviderConfig,
} from './twilio-whatsapp.provider';

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  provider: TwilioWhatsAppProviderConfig;
}

export function readTwilioConfig(env: NodeJS.ProcessEnv = process.env): TwilioConfig | null {
  const accountSid = env.TWILIO_ACCOUNT_SID;
  const authToken = env.TWILIO_AUTH_TOKEN;
  const from = env.TWILIO_WHATSAPP_FROM;
  const statusCallbackUrl = env.TWILIO_WHATSAPP_STATUS_CALLBACK_URL;

  if (!accountSid || !authToken || !from) return null;

  return {
    accountSid,
    authToken,
    provider: {
      from,
      ...(statusCallbackUrl ? { statusCallbackUrl } : {}),
      ...(env.COLLABORATOR_APP_URL ? { collaboratorAppUrl: env.COLLABORATOR_APP_URL } : {}),
    },
  };
}

const notConfiguredProvider: WhatsAppProvider = {
  name: 'not-configured',
  async sendTemplateMessage() {
    throw new WhatsAppProviderError(
      'NOT_CONFIGURED',
      'O provedor de WhatsApp não está configurado.',
    );
  },
  async sendTemplate() {
    throw new WhatsAppProviderError(
      'NOT_CONFIGURED',
      'O provedor de WhatsApp não está configurado.',
    );
  },
};

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

export function resolveWhatsAppProvider(
  selected: string | undefined = process.env.WHATSAPP_PROVIDER,
): WhatsAppProvider {
  if (selected === 'emulator-test-double' && process.env.FUNCTIONS_EMULATOR === 'true') {
    return emulatorTestDouble;
  }
  if (selected === 'twilio') {
    const config = readTwilioConfig();
    if (config) {
      return createTwilioWhatsAppProvider(
        twilio(config.accountSid, config.authToken),
        config.provider,
      );
    }
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
