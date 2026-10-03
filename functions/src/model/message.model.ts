import type { Timestamp } from 'firebase-admin/firestore';
import type { MessageStatus } from '../../../shared/domain/interfaces/message.interface';

export interface MessageDocument {
  tenantId: string;
  connectionId: string;
  contactId: string;
  appointmentId?: string;
  direction: 'inbound' | 'outbound';
  content: string;
  templateCategory?: string;
  status: MessageStatus;
  providerMessageId?: string;
  failureCode?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
