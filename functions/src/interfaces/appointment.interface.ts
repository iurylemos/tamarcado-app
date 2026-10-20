import { Timestamp } from 'firebase-admin/firestore';
import type { AppointmentStatus } from '../../../shared/domain/appointment-status';
import type { AppointmentDocument } from '../model/appointment.model';

type CollaboratorAppointmentWithoutDate = Omit<CollaboratorAppointment, 'startsAt' | 'endsAt'>;

export type AppointmentCustomerEvent =
  'requested' | 'confirmed' | 'cancelled' | 'rescheduled' | 'completed';

export type AppointmentParticipants = {
  customer: string;
  collaborator: string;
};

export interface CollaboratorAppointment extends AppointmentDocument {
  id: string;
  startsAt: Timestamp;
  endsAt: Timestamp;
}

export interface CollaboratorAppointmentResponse extends CollaboratorAppointmentWithoutDate {
  startsAt: string;
  endsAt: string;
}

export interface ListAppointmentsInput {
  date?: string;
  statuses?: AppointmentStatus[];
}

export type UpdateAppointmentInputData = { appointmentId: string; status: AppointmentStatus };

export type AppointmentDataTime = {
  appointments: CollaboratorAppointmentResponse[];
  timezone: string;
};

export interface UpdateAppointmentInput {
  appointmentId: string;
  startsAt: string;
  professionalId: string;
}
