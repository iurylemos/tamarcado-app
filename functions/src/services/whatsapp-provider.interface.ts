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

export type TemplateParameter =
  | { type: 'text'; text: string }
  | { type: 'payload'; payload: string }
  | { type: 'image'; image: { link: string } };

export interface TemplateComponent {
  type: 'header' | 'body' | 'button';
  sub_type?: 'quick_reply' | 'url';
  index?: string;
  parameters: TemplateParameter[];
}

export interface RichTemplateRequest {
  phoneE164: string;
  templateName: string;
  components: TemplateComponent[];
}

export interface WhatsAppProvider {
  readonly name: string;
  sendTemplateMessage(request: TemplateMessageRequest): Promise<{ providerMessageId: string }>;
  sendTemplate(request: RichTemplateRequest): Promise<{ providerMessageId: string }>;
}

