import type { CommissionType } from './product.interface.js';
import type { AppointmentStatus } from '../appointment-status.js';

export interface Appointment {
  id: string;
  tenantId: string;
  customerPhoneE164: string;
  customerName?: string;
  productId: string;
  professionalId: string;
  professionalNameSnapshot: string;
  startsAt: Date;
  endsAt: Date;
  durationMinutes: number;
  status: AppointmentStatus;
  productNameSnapshot: string;
  productImageUrlSnapshot?: string;
  productPriceCentsSnapshot: number;
  commissionTypeSnapshot: CommissionType;
  commissionValueSnapshot: number;
  commissionAmountCentsSnapshot: number;
  whatsappOptIn: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface CreatePublicAppointmentInput {
  businessSlug: string;
  productId: string;
  professionalId: string;
  startsAt: string;
  customerPhone: string;
  customerName: string;
  whatsappOptIn?: boolean;
}
