import type { Timestamp } from 'firebase-admin/firestore';

export interface WorkingHoursDocument {
  tenantId: string;
  professionalId: string;
  dayOfWeek: number;
  startLocalTime: string;
  endLocalTime: string;
  active: boolean;
}

export interface BlockedPeriodDocument {
  tenantId: string;
  professionalId?: string;
  startsAt: Timestamp;
  endsAt: Timestamp;
  reason?: string;
  createdBy: string;
  createdAt: Timestamp;
}
