export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface Message {
  id: string;
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
  createdAt: Date;
  updatedAt: Date;
}
