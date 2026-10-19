import type { Timestamp } from 'firebase-admin/firestore';

export type AppointmentNotificationJobStatus = 'pending' | 'completed' | 'failed';

export interface AppointmentNotificationJobDocument {
  appointmentId: string;
  tenantId: string;
  correlationId: string;
  status: AppointmentNotificationJobStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  failureCode?: 'provider_delivery_failed';
}
