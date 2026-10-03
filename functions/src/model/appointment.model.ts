import type { Timestamp } from 'firebase-admin/firestore';
import type { AppointmentStatus } from '../../../shared/domain/appointment-status';
import type { CommissionType } from '../../../shared/domain/interfaces/product.interface';

export interface AppointmentDocument {
  tenantId: string;
  customerPhoneE164: string;
  customerName?: string;
  productId: string;
  professionalId: string;
  professionalNameSnapshot: string;
  startsAt: Timestamp;
  endsAt: Timestamp;
  durationMinutes: number;
  status: AppointmentStatus;
  productNameSnapshot: string;
  productPriceCentsSnapshot: number;
  commissionTypeSnapshot: CommissionType;
  commissionValueSnapshot: number;
  commissionAmountCentsSnapshot: number;
  whatsappOptIn: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

export interface BookingReservationDocument {
  tenantId: string;
  professionalId: string;
  appointmentId: string;
  bucketStartAt: Timestamp;
  createdAt: Timestamp;
}
