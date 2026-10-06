import {
  collection,
  onSnapshot,
  query,
  where,
  type DocumentData,
  type QueryConstraint,
  type Unsubscribe,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { getZonedDateTimeParts } from '@shared/timezone';
import { auth, db, functions } from '../config/firebase.config';
import type {
  AppointmentEligibleProfessionalListItem,
  AppointmentListResponse,
  AppointmentUpdateStatusData,
  CollaboratorAppointment,
  EligibleProfessional,
  RawAppointment,
} from '../interfaces/appointment.interface';
import type { AppointmentListFilters } from '../interfaces/appointment.interface';
import type { AppointmentStatus } from '@shared/appointment-status';

function parseAppointment(data: DocumentData, id: string): CollaboratorAppointment {
  const appointment = data as RawAppointment;
  return {
    ...appointment,
    id,
    startsAt: appointment.startsAt.toDate(),
    endsAt: appointment.endsAt.toDate(),
  };
}

export async function listAppointments(
  filters: AppointmentListFilters = {},
): Promise<AppointmentListResponse> {
  const callable = httpsCallable<AppointmentListFilters, AppointmentListResponse>(
    functions,
    'listAppointments',
  );
  const { data } = await callable(filters);
  return {
    appointments: data.appointments.map((appointment) => ({
      ...appointment,
      startsAt: new Date(appointment.startsAt),
      endsAt: new Date(appointment.endsAt),
    })),
    timezone: data.timezone,
  };
}

export async function subscribeToAppointments(
  onChange: (appointments: CollaboratorAppointment[]) => void,
  onError: (error: Error) => void,
): Promise<Unsubscribe> {
  const user = auth.currentUser;
  if (!user) throw new Error('Entre na sua conta para acompanhar os agendamentos.');
  const { claims } = await user.getIdTokenResult();
  if (claims.role !== 'collaborator' || typeof claims.tenantId !== 'string') {
    throw new Error('Esta conta não tem acesso à agenda de colaboradores.');
  }

  const constraints: QueryConstraint[] = [where('tenantId', '==', claims.tenantId)];
  if (typeof claims.professionalId === 'string') {
    constraints.push(where('professionalId', '==', claims.professionalId));
  }
  return onSnapshot(
    query(collection(db, 'appointments'), ...constraints),
    (snapshot) =>
      onChange(snapshot.docs.map((document) => parseAppointment(document.data(), document.id))),
    onError,
  );
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: AppointmentStatus,
): Promise<void> {
  const callable = httpsCallable<AppointmentUpdateStatusData, AppointmentUpdateStatusData>(
    functions,
    'updateAppointmentStatus',
  );
  await callable({ appointmentId, status });
}

export async function listEligibleProfessionals(
  appointmentId: string,
): Promise<EligibleProfessional[]> {
  const callable = httpsCallable<AppointmentEligibleProfessionalListItem, EligibleProfessional[]>(
    functions,
    'listEligibleAppointmentProfessionals',
  );
  const { data } = await callable({ appointmentId });
  return data;
}

export async function rescheduleAppointment(input: {
  appointmentId: string;
  startsAt: string;
  professionalId: string;
}): Promise<void> {
  const callable = httpsCallable<typeof input, unknown>(functions, 'updateAppointment');
  await callable(input);
}

export function appointmentLocalDate(date: Date, timezone: string): string {
  const parts = getZonedDateTimeParts(date, timezone);
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}
