import { HttpsError } from 'firebase-functions/v2/https';
import { WhatsAppProviderError } from './whatsapp-provider.interface';
import { whatsappProvider } from './whatsapp-provider.service';

export interface WhatsAppVerificationProvider {
  sendCode(phoneE164: string, code: string): Promise<void>;
}

export const whatsappVerificationProvider: WhatsAppVerificationProvider = {
  async sendCode(phoneE164, code) {
    try {
      await whatsappProvider.sendCode(phoneE164, code);
    } catch (error) {
      if (!(error instanceof WhatsAppProviderError)) throw error;
      throw new HttpsError(
        'failed-precondition',
        error.code === 'NOT_CONFIGURED'
          ? 'A verificação por WhatsApp ainda não está configurada para esta empresa.'
          : 'Não foi possível enviar o código por WhatsApp. Tente novamente.',
      );
    }
  },
};