import type { AppointmentStatus } from '@shared/appointment-status';

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
