import { AppointmentDocument } from '../model/appointment.model';
import { BlockedPeriodDocument, WorkingHoursDocument } from '../model/availability.model';

export interface RequestedSlotValidationInput {
  tenantId: string;
  professionalId: string;
  startsAt: Date;
  durationMinutes: number;
  timezone: string;
  bookingIntervalMinutes: number;
  coldStart?: boolean;
  correlationId?: string;
}

export interface ProfessionalRecord {
  id: string;
  tenantId: string;
  name: string;
  active: boolean;
}

export interface BoundedProfessionalSchedule {
  professional: ProfessionalRecord;
  hours: WorkingHoursDocument[];
  appointments: Array<AppointmentDocument>;
  reservations: number[];
  blocks: BlockedPeriodDocument[];
}

export interface BoundedAvailabilityContext {
  timezone: string;
  bookingInterval: number;
  durationMinutes: number;
  professionals: BoundedProfessionalSchedule[];
  now: number;
}
