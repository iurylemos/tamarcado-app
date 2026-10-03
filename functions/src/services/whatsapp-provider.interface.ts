export const approvedTemplateCategories = [
  'appointment_confirmation',
  'appointment_reminder',
  'appointment_update',
] as const;

export type ApprovedTemplateCategory = (typeof approvedTemplateCategories)[number];

export function isApprovedTemplate(value: unknown): value is ApprovedTemplateCategory {
  return approvedTemplateCategories.some((category) => category === value);
}

export class WhatsAppProviderError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'WhatsAppProviderError';
  }
}

export interface TemplateMessageRequest {
  phoneE164: string;
  templateCategory: ApprovedTemplateCategory;
  content: string;
}

export interface WhatsAppProvider {
  readonly name: string;
  sendCode(phoneE164: string, code: string): Promise<void>;
  sendTemplateMessage(request: TemplateMessageRequest): Promise<{ providerMessageId: string }>;
}
