import type { Timestamp } from 'firebase-admin/firestore';
import type { AppointmentStatus } from '../../../shared/domain/appointment-status';
import type {
  CommissionType,
  ProductCustomizationSnapshot,
} from '../../../shared/domain/interfaces/product.interface';

export interface AppointmentPromotionSnapshot {
  promotionApplied: true;
  promotionalPriceCents: number;
}

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
  productImageUrlSnapshot?: string;
  customizationSnapshot?: ProductCustomizationSnapshot[];
  productPriceCentsSnapshot: number;
  productOriginalPriceCentsSnapshot?: number;
  promotionSnapshot?: AppointmentPromotionSnapshot;
  estimatedDeliveryDaysSnapshot?: number;
  estimatedDeliveryDateSnapshot?: string;
  estimatedDeliveryTimezoneSnapshot?: string;
  paymentMethodSnapshot?: 'debit' | 'credit' | 'cash' | 'pix';
  installmentsSnapshot?: number;
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
