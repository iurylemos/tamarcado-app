import type { AppointmentStatus } from '@shared/appointment-status';
import type { ProductCustomizationSnapshot } from '@shared/interfaces/product.interface';

export interface CollaboratorAppointment {
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
  whatsappOptIn: boolean;
}

export interface EligibleProfessional {
  id: string;
  name: string;
}

export interface CollaboratorCustomer {
  phoneE164: string;
  name?: string;
  completedAttendanceCount: number;
  latestAttendanceMonth?: number;
  latestAttendanceYear?: number;
  latestAppointmentAt: string;
  canContactOnWhatsApp: boolean;
}

export interface AppointmentListFilters {
  date?: string;
  statuses?: AppointmentStatus[];
}

export type AppointmentUpdateStatusData = { appointmentId: string; status: AppointmentStatus };

export type AppointmentListResponse = {
  appointments: Array<CollaboratorAppointment>;
  timezone: string;
};
export interface RawAppointment extends Omit<CollaboratorAppointment, 'startsAt' | 'endsAt'> {
  startsAt: { toDate(): Date };
  endsAt: { toDate(): Date };
}

export type AppointmentEligibleProfessionalListItem = { appointmentId: string };
