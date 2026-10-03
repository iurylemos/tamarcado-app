import type { Timestamp } from 'firebase-admin/firestore';

export interface ContactDocument {
  tenantId: string;
  connectionId: string;
  phoneE164: string;
  name?: string;
  whatsappOptIn: boolean;
  optInAt?: Timestamp;
  optOutAt?: Timestamp;
  consentSource?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
