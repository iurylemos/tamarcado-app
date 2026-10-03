import { randomUUID } from 'node:crypto';
import { collections } from '../config/collections';
import { firestore } from './firestore.service';
import {
  WhatsAppProviderError,
  type TemplateMessageRequest,
  type WhatsAppProvider,
} from './whatsapp-provider.interface';

const unconfiguredProvider: WhatsAppProvider = {
  name: 'unconfigured',
  async sendCode() {
    throw new WhatsAppProviderError('NOT_CONFIGURED', 'O provedor de WhatsApp não está configurado.');
  },
  async sendTemplateMessage() {
    throw new WhatsAppProviderError('NOT_CONFIGURED', 'O provedor de WhatsApp não está configurado.');
  },
};

// Local-only double. It records deliveries in an outbox instead of calling a real provider,
// and rejects phones ending in 0666 so failure paths can be exercised.
const emulatorTestDouble: WhatsAppProvider = {
  name: 'emulator-test-double',
  async sendCode(phoneE164, code) {
    if (phoneE164.endsWith('0666')) {
      throw new WhatsAppProviderError('REJECTED', 'Número rejeitado pelo provedor de teste.');
    }
    await firestore
      .collection(collections.providerOutbox)
      .add({ kind: 'code', phoneE164, code, createdAt: Date.now() });
  },
  async sendTemplateMessage(request: TemplateMessageRequest) {
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
};

// Provider selection is deployment configuration (WHATSAPP_PROVIDER). Credentials for real
// providers must be read from server-side secrets only and never returned to clients.
export function resolveWhatsAppProvider(
  selected: string | undefined = process.env.WHATSAPP_PROVIDER,
): WhatsAppProvider {
  if (selected === 'emulator-test-double' && process.env.FUNCTIONS_EMULATOR === 'true') {
    return emulatorTestDouble;
  }
  return unconfiguredProvider;
}

export const whatsappProvider: WhatsAppProvider = {
  name: 'dynamic',
  sendCode: (phone, code) => resolveWhatsAppProvider().sendCode(phone, code),
  sendTemplateMessage: (request) => resolveWhatsAppProvider().sendTemplateMessage(request),
};
