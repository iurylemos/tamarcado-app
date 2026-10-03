export interface Contact {
  id: string;
  tenantId: string;
  connectionId: string;
  phoneE164: string;
  name?: string;
  whatsappOptIn: boolean;
  optInAt?: Date;
  optOutAt?: Date;
  consentSource?: string;
}
