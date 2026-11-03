import type { CommissionType } from './product.interface.js';
import type { AppointmentStatus } from '../appointment-status.js';
import type {
  ProductCustomizationSelection,
  ProductCustomizationSnapshot,
} from './product.interface.js';

export interface AppointmentPromotionSnapshot {
  promotionApplied: true;
  promotionalPriceCents: number;
}

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
  customizationSnapshot?: ProductCustomizationSnapshot[];
  productPriceCentsSnapshot: number;
  productOriginalPriceCentsSnapshot?: number;
  promotionSnapshot?: AppointmentPromotionSnapshot;
  estimatedDeliveryDaysSnapshot?: number;
  estimatedDeliveryDateSnapshot?: string;
  estimatedDeliveryTimezoneSnapshot?: string;
  paymentMethodSnapshot?: PaymentMethod;
  installmentsSnapshot?: number;
  commissionTypeSnapshot: CommissionType;
  commissionValueSnapshot: number;
  commissionAmountCentsSnapshot: number;
  whatsappOptIn: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export type PaymentMethod = 'debit' | 'credit' | 'cash' | 'pix';

export interface CreatePublicAppointmentInput {
  businessSlug: string;
  productId: string;
  professionalId?: string;
  startsAt?: string;
  customerPhone: string;
  customerName: string;
  whatsappOptIn?: boolean;
  customizationSelections?: ProductCustomizationSelection[];
  selectedImageId?: string;
  paymentMethod: PaymentMethod;
  installments?: number;
}

export interface AppointmentEstimatedDelivery {
  days: number;
  estimatedDate: string;
  timezone: string;
}

export interface CreatePublicAppointmentResult {
  appointmentId: string;
  status: 'pending';
  professionalId: string;
  professionalName: string;
  startsAt: string;
  endsAt: string;
  effectivePriceCents: number;
  originalPriceCents: number;
  promotionApplied: boolean;
  estimatedDelivery?: AppointmentEstimatedDelivery;
}
