export type WhatsAppSendTemplate = { providerMessageId: string };
export type WebhookMessageResult = 'applied' | 'duplicate' | 'ignored' | 'unknown-message';

export type WhatsappButtonReply = {
  from: string;
  payload: string;
  eventId: string;
};
