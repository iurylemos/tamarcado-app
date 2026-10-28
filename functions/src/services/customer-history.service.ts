import { HttpsError } from 'firebase-functions/v2/https';
import { getZonedDateTimeParts } from '../../../shared/domain/timezone';
import type { AppointmentDocument } from '../model/appointment.model';
import type { AuthorizedActor } from './authorization.service';
import { collections } from '../config/collections';
import { firestore } from './firestore.service';

export interface CollaboratorCustomerHistory {
  phoneE164: string;
  name?: string;
  completedAttendanceCount: number;
  latestAttendanceMonth?: number;
  latestAttendanceYear?: number;
  latestAppointmentAt: string;
  canContactOnWhatsApp: boolean;
}

export async function listCustomerHistory(
  actor: AuthorizedActor,
): Promise<{ customers: CollaboratorCustomerHistory[]; timezone: string }> {
  const [tenantSnapshot, appointmentsSnapshot] = await Promise.all([
    firestore.collection(collections.tenants).doc(actor.tenantId).get(),
    firestore.collection(collections.appointments).where('tenantId', '==', actor.tenantId).get(),
  ]);
  const timezone = tenantSnapshot.data()?.timezone;
  if (!tenantSnapshot.exists || typeof timezone !== 'string') {
    throw new HttpsError('failed-precondition', 'O fuso horário da empresa não está configurado.');
  }

  const customers = new Map<
    string,
    {
      name?: string;
      completed: Date[];
      latestAppointmentAt: Date;
      canContactOnWhatsApp: boolean;
    }
  >();

  for (const appointmentDocument of appointmentsSnapshot.docs) {
    const appointment = appointmentDocument.data() as AppointmentDocument;

    if (
      appointment.tenantId !== actor.tenantId ||
      (actor.professionalId && appointment.professionalId !== actor.professionalId) ||
      !appointment.customerPhoneE164
    ) {
      continue;
    }

    const startsAt = appointment.startsAt.toDate();
    const existing = customers.get(appointment.customerPhoneE164) ?? {
      completed: [],
      latestAppointmentAt: startsAt,
      canContactOnWhatsApp: false,
    };

    if (!existing.name && appointment.customerName) existing.name = appointment.customerName;

    if (appointment.status === 'completed') existing.completed.push(startsAt);

    if (startsAt > existing.latestAppointmentAt) existing.latestAppointmentAt = startsAt;

    if (
      appointment.whatsappOptIn === true &&
      (appointment.status === 'pending' || appointment.status === 'confirmed')
    ) {
      existing.canContactOnWhatsApp = true;
    }

    customers.set(appointment.customerPhoneE164, existing);
  }

  const result = [...customers.entries()].map(([phoneE164, customer]) => {
    const latestAttendance = customer.completed.reduce<Date | undefined>(
      (latest, attendance) => (!latest || attendance > latest ? attendance : latest),
      undefined,
    );
    const latestParts = latestAttendance
      ? getZonedDateTimeParts(latestAttendance, timezone)
      : undefined;
    return {
      phoneE164,
      ...(customer.name ? { name: customer.name } : {}),
      completedAttendanceCount: customer.completed.length,
      ...(latestParts
        ? {
            latestAttendanceMonth: latestParts.month,
            latestAttendanceYear: latestParts.year,
          }
        : {}),
      latestAppointmentAt: customer.latestAppointmentAt.toISOString(),
      canContactOnWhatsApp: customer.canContactOnWhatsApp,
    };
  });
  result.sort((first, second) =>
    second.latestAppointmentAt.localeCompare(first.latestAppointmentAt),
  );
  return { customers: result, timezone };
}
