import type { CreatePublicAppointmentInput } from '@shared/interfaces/appointment.interface';

export type BookingInput = CreatePublicAppointmentInput;

export interface BookingResult {
  appointmentId: string;
  status: 'pending';
}
