import { HttpsError } from 'firebase-functions/v2/https';

export interface WhatsAppVerificationProvider {
  sendCode(phoneE164: string, code: string): Promise<void>;
}

export const whatsappVerificationProvider: WhatsAppVerificationProvider = {
  async sendCode() {
    throw new HttpsError(
      'failed-precondition',
      'A verificação por WhatsApp ainda não está configurada para esta empresa.',
    );
  },
};
