import { Timestamp, type DocumentData, type QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import {
  canTransitionAppointment,
  type AppointmentStatus,
} from '../../../shared/domain/appointment-status';
import { fiveMinuteBucketStarts, intervalsOverlap } from '../../../shared/domain/interval';
import {
  getZonedDateTimeParts,
  isoWeekday,
  isValidDateString,
  localDateTimeToUtc,
} from '../../../shared/domain/timezone';
import type { AppointmentDocument, BookingReservationDocument } from '../model/appointment.model';
import type { AuthorizedActor } from './authorization.service';
import { collections } from '../config/collections';
import { firestore, professionalProductId } from './firestore.service';
import { reservationDocumentId } from './booking.service';
import type {
  AppointmentDataTime,
  CollaboratorAppointment,
  CollaboratorAppointmentResponse,
  ListAppointmentsInput,
  UpdateAppointmentInputData,
} from '../interfaces/appointment.interface';
import type { TenantDocument } from '../model/tenant.model';

type UpdateAppointmentResult = UpdateAppointmentInput & {
  endsAt: string;
};

function nextLocalDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  const next = new Date(Date.UTC(year!, month! - 1, day! + 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`;
}

function isDateString(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    return isValidDateString(value);
  } catch (error: unknown) {
    if (error instanceof RangeError) return false;
    throw error;
  }
}

function appointmentFromSnapshot(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): CollaboratorAppointment {
  return { id: snapshot.id, ...(snapshot.data() as AppointmentDocument) };
}

function appointmentResponse(
  appointment: CollaboratorAppointment,
): CollaboratorAppointmentResponse {
  return {
    ...appointment,
    startsAt: appointment.startsAt.toDate().toISOString(),
    endsAt: appointment.endsAt.toDate().toISOString(),
  };
}

export async function listAppointments(
  actor: AuthorizedActor,
  input: ListAppointmentsInput,
): Promise<AppointmentDataTime> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new HttpsError('invalid-argument', 'Os filtros de agendamento são inválidos.');
  }

  if (input.date !== undefined && !isDateString(input.date)) {
    throw new HttpsError('invalid-argument', 'Informe uma data válida no formato AAAA-MM-DD.');
  }

  const verifyStatus =
    !Array.isArray(input.statuses) ||
    input.statuses.some(
      (status) => !['pending', 'confirmed', 'cancelled', 'completed'].includes(status),
    );

  if (input.statuses !== undefined && verifyStatus) {
    throw new HttpsError('invalid-argument', 'Um ou mais filtros de status são inválidos.');
  }

  const tenantSnapshot = await firestore.collection(collections.tenants).doc(actor.tenantId).get();

  const tenant = tenantSnapshot.data() as TenantDocument;

  if (!tenantSnapshot.exists || typeof tenant.timezone !== 'string') {
    throw new HttpsError('failed-precondition', 'O fuso horário da empresa não está configurado.');
  }

  let start: Date | undefined;
  let end: Date | undefined;

  if (input.date) {
    try {
      start = localDateTimeToUtc(input.date, '00:00', tenant.timezone);
      end = localDateTimeToUtc(nextLocalDate(input.date), '00:00', tenant.timezone);
    } catch (error: unknown) {
      if (!(error instanceof RangeError)) throw error;
      throw new HttpsError(
        'invalid-argument',
        'A data não é válida para o fuso horário da empresa.',
      );
    }
  }

  const snapshot = await firestore
    .collection(collections.appointments)
    .where('tenantId', '==', actor.tenantId)
    .get();

  const statuses = input.statuses ? new Set(input.statuses) : undefined;

  const appointments = snapshot.docs
    .map(appointmentFromSnapshot)
    .filter((appointment) => {
      if (actor.professionalId && appointment.professionalId !== actor.professionalId) return false;
      if (statuses && !statuses.has(appointment.status)) return false;
      const startsAt = appointment.startsAt.toDate();
      return !start || (startsAt >= start && startsAt < end!);
    })
    .sort((first, second) => first.startsAt.toMillis() - second.startsAt.toMillis())
    .map(appointmentResponse);

  return { appointments, timezone: tenant.timezone };
}

export async function updateAppointmentStatus(
  actor: AuthorizedActor,
  appointmentId: string,
  nextStatus: AppointmentStatus,
): Promise<UpdateAppointmentInputData> {
  if (!appointmentId || !['pending', 'confirmed', 'cancelled', 'completed'].includes(nextStatus)) {
    throw new HttpsError('invalid-argument', 'Os dados da atualização são inválidos.');
  }

  const appointmentRef = firestore.collection(collections.appointments).doc(appointmentId);

  const result = await firestore.runTransaction(async (transaction) => {
    const appointmentSnapshot = await transaction.get(appointmentRef);
    const appointment = appointmentSnapshot.data() as AppointmentDocument;

    if (!appointmentSnapshot.exists || appointment?.tenantId !== actor.tenantId) {
      throw new HttpsError('not-found', 'Agendamento não encontrado.');
    }

    if (actor.professionalId && actor.professionalId !== appointment.professionalId) {
      throw new HttpsError('permission-denied', 'Você não tem acesso a este agendamento.');
    }

    if (!canTransitionAppointment(appointment.status, nextStatus)) {
      throw new HttpsError('failed-precondition', 'Esta mudança de status não é permitida.');
    }

    const reservationsQuery = firestore
      .collection(collections.bookingReservations)
      .where('appointmentId', '==', appointmentId);

    const reservations = await transaction.get(reservationsQuery);

    transaction.update(appointmentRef, {
      status: nextStatus,
      updatedAt: Timestamp.now(),
      updatedBy: actor.uid,
    });

    if (nextStatus === 'cancelled' || nextStatus === 'completed') {
      for (const reservationDocument of reservations.docs) {
        if (reservationDocument.data().tenantId === actor.tenantId) {
          transaction.delete(reservationDocument.ref);
        }
      }
    }

    return { appointmentId, status: nextStatus };
  });

  return result;
}

export interface UpdateAppointmentInput {
  appointmentId: string;
  startsAt: string;
  professionalId: string;
}

function parseAppointmentDate(value: string): Date {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== value) {
    throw new HttpsError('invalid-argument', 'Escolha uma data e um horário válidos.');
  }
  return date;
}

function minutesFromLocalTime(value: string): number | undefined {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : undefined;
}

export async function updateAppointment(
  actor: AuthorizedActor,
  input: UpdateAppointmentInput,
): Promise<UpdateAppointmentResult> {
  if (
    !input ||
    typeof input.appointmentId !== 'string' ||
    !input.appointmentId ||
    typeof input.professionalId !== 'string' ||
    !input.professionalId ||
    typeof input.startsAt !== 'string'
  ) {
    throw new HttpsError('invalid-argument', 'Informe o novo horário e o profissional.');
  }

  const startsAt = parseAppointmentDate(input.startsAt);
  const appointmentRef = firestore.collection(collections.appointments).doc(input.appointmentId);

  const result = await firestore.runTransaction(async (transaction) => {
    const appointmentSnapshot = await transaction.get(appointmentRef);
    const appointment = appointmentSnapshot.data() as AppointmentDocument | undefined;

    if (!appointmentSnapshot.exists || appointment?.tenantId !== actor.tenantId) {
      throw new HttpsError('not-found', 'Agendamento não encontrado.');
    }

    if (actor.professionalId && actor.professionalId !== appointment.professionalId) {
      throw new HttpsError('permission-denied', 'Você não tem acesso a este agendamento.');
    }

    if (actor.professionalId && input.professionalId !== actor.professionalId) {
      throw new HttpsError(
        'permission-denied',
        'Seu perfil não permite atribuir outro profissional.',
      );
    }

    if (appointment.status !== 'pending' && appointment.status !== 'confirmed') {
      throw new HttpsError(
        'failed-precondition',
        'Somente agendamentos pendentes ou confirmados podem ser editados.',
      );
    }

    const tenantRef = firestore.collection(collections.tenants).doc(actor.tenantId);
    const productRef = firestore.collection(collections.products).doc(appointment.productId);
    const professionalRef = firestore
      .collection(collections.professionals)
      .doc(input.professionalId);
    const associationRef = firestore
      .collection(collections.professionalProducts)
      .doc(professionalProductId(actor.tenantId, input.professionalId, appointment.productId));

    const [tenantSnapshot, productSnapshot, professionalSnapshot, associationSnapshot] =
      await Promise.all([
        transaction.get(tenantRef),
        transaction.get(productRef),
        transaction.get(professionalRef),
        transaction.get(associationRef),
      ]);

    const tenant = tenantSnapshot.data();
    const product = productSnapshot.data();
    const professional = professionalSnapshot.data();

    if (
      !tenantSnapshot.exists ||
      typeof tenant?.timezone !== 'string' ||
      !Number.isInteger(tenant.bookingIntervalMinutes) ||
      tenant.bookingIntervalMinutes < 5 ||
      tenant.bookingIntervalMinutes % 5 !== 0 ||
      !productSnapshot.exists ||
      product?.tenantId !== actor.tenantId ||
      product.active !== true ||
      !professionalSnapshot.exists ||
      professional?.tenantId !== actor.tenantId ||
      professional.active !== true ||
      !associationSnapshot.exists ||
      associationSnapshot.data()?.tenantId !== actor.tenantId ||
      associationSnapshot.data()?.active !== true
    ) {
      throw new HttpsError(
        'failed-precondition',
        'O serviço ou profissional não está mais disponível.',
      );
    }

    let local;

    try {
      local = getZonedDateTimeParts(startsAt, tenant.timezone);
    } catch (error: unknown) {
      if (!(error instanceof RangeError)) throw error;
      throw new HttpsError('failed-precondition', 'O fuso horário da empresa não é válido.');
    }

    const date = `${local.year}-${String(local.month).padStart(2, '0')}-${String(local.day).padStart(2, '0')}`;
    const time = `${String(local.hour).padStart(2, '0')}:${String(local.minute).padStart(2, '0')}`;
    const requestedMinute = minutesFromLocalTime(time);
    const durationMinutes = appointment.durationMinutes;
    const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);

    if (
      startsAt.getTime() <= Date.now() ||
      !Number.isInteger(durationMinutes) ||
      durationMinutes <= 0
    ) {
      throw new HttpsError('failed-precondition', 'Escolha um horário futuro válido.');
    }

    const weekday = isoWeekday(date);

    const hoursQuery = firestore
      .collection(collections.workingHours)
      .where('tenantId', '==', actor.tenantId)
      .where('professionalId', '==', input.professionalId)
      .where('dayOfWeek', '==', weekday)
      .where('active', '==', true);

    const blocksQuery = firestore
      .collection(collections.blockedPeriods)
      .where('tenantId', '==', actor.tenantId);

    const appointmentsQuery = firestore
      .collection(collections.appointments)
      .where('tenantId', '==', actor.tenantId)
      .where('professionalId', '==', input.professionalId)
      .where('status', 'in', ['pending', 'confirmed']);

    const oldReservationsQuery = firestore
      .collection(collections.bookingReservations)
      .where('appointmentId', '==', input.appointmentId);

    const buckets = fiveMinuteBucketStarts({
      startsAt: startsAt.getTime(),
      endsAt: endsAt.getTime(),
    });

    const desiredReservationRefs = buckets.map((bucket) =>
      firestore
        .collection(collections.bookingReservations)
        .doc(reservationDocumentId(actor.tenantId, input.professionalId, bucket)),
    );

    const [hoursSnapshot, blocksSnapshot, activeAppointments, oldReservations, targetReservations] =
      await Promise.all([
        transaction.get(hoursQuery),
        transaction.get(blocksQuery),
        transaction.get(appointmentsQuery),
        transaction.get(oldReservationsQuery),
        Promise.all(desiredReservationRefs.map((reference) => transaction.get(reference))),
      ]);

    const localMinute = requestedMinute;
    const interval = Number(tenant.bookingIntervalMinutes);

    const withinWorkingHours = hoursSnapshot.docs.some((document) => {
      const hour = document.data();
      const opening = minutesFromLocalTime(String(hour.startLocalTime));
      const closing = minutesFromLocalTime(String(hour.endLocalTime));
      return (
        hour.tenantId === actor.tenantId &&
        hour.professionalId === input.professionalId &&
        hour.active === true &&
        opening !== undefined &&
        closing !== undefined &&
        localMinute !== undefined &&
        localMinute >= opening &&
        localMinute + durationMinutes <= closing &&
        (localMinute - opening) % interval === 0
      );
    });

    if (!withinWorkingHours) {
      throw new HttpsError(
        'failed-precondition',
        'O horário está fora do expediente ou do intervalo de agendamento.',
      );
    }

    const requestedInterval = { startsAt: startsAt.getTime(), endsAt: endsAt.getTime() };

    const isBlocked = blocksSnapshot.docs.some((document) => {
      const block = document.data();
      return (
        block.tenantId === actor.tenantId &&
        (!block.professionalId || block.professionalId === input.professionalId) &&
        intervalsOverlap(requestedInterval, {
          startsAt: (block.startsAt as Timestamp).toMillis(),
          endsAt: (block.endsAt as Timestamp).toMillis(),
        })
      );
    });

    if (isBlocked) throw new HttpsError('already-exists', 'O horário escolhido está bloqueado.');

    const hasAppointmentConflict = activeAppointments.docs.some((document) => {
      if (document.id === input.appointmentId) return false;
      const other = document.data();

      return (
        other.tenantId === actor.tenantId &&
        other.professionalId === input.professionalId &&
        (other.status === 'pending' || other.status === 'confirmed') &&
        intervalsOverlap(requestedInterval, {
          startsAt: (other.startsAt as Timestamp).toMillis(),
          endsAt: (other.endsAt as Timestamp).toMillis(),
        })
      );
    });

    if (hasAppointmentConflict) {
      throw new HttpsError(
        'already-exists',
        'Este horário acabou de ser reservado. Escolha outro horário.',
      );
    }

    const valTarget = targetReservations.some((reservation) => {
      if (!reservation.exists) return false;

      const data = reservation.data() as BookingReservationDocument;

      return (
        data.tenantId !== actor.tenantId ||
        data.professionalId !== input.professionalId ||
        data.appointmentId !== input.appointmentId
      );
    });

    if (valTarget) {
      throw new HttpsError(
        'already-exists',
        'Este horário acabou de ser reservado. Escolha outro horário.',
      );
    }

    const desiredIds = new Set(desiredReservationRefs.map((reference) => reference.id));

    for (const reservation of oldReservations.docs) {
      if (reservation.data().tenantId === actor.tenantId && !desiredIds.has(reservation.id)) {
        transaction.delete(reservation.ref);
      }
    }

    const createdAt = Timestamp.now();

    for (const reservation of targetReservations) {
      if (!reservation.exists) {
        const index = targetReservations.indexOf(reservation);

        if (desiredReservationRefs[index] && buckets[index]) {
          transaction.create(desiredReservationRefs[index], {
            tenantId: actor.tenantId,
            professionalId: input.professionalId,
            appointmentId: input.appointmentId,
            bucketStartAt: Timestamp.fromMillis(buckets[index]),
            createdAt,
          });
        }
      }
    }

    transaction.update(appointmentRef, {
      startsAt: Timestamp.fromDate(startsAt),
      endsAt: Timestamp.fromDate(endsAt),
      professionalId: input.professionalId,
      professionalNameSnapshot: professional.name,
      updatedAt: createdAt,
      updatedBy: actor.uid,
    });

    return {
      appointmentId: input.appointmentId,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      professionalId: input.professionalId,
    };
  });

  return result;
}

export async function listEligibleAppointmentProfessionals(
  actor: AuthorizedActor,
  appointmentId: string,
): Promise<Array<{ id: string; name: string }>> {
  if (!appointmentId) throw new HttpsError('invalid-argument', 'Informe o agendamento.');

  const appointmentSnapshot = await firestore
    .collection(collections.appointments)
    .doc(appointmentId)
    .get();

  const appointment = appointmentSnapshot.data() as AppointmentDocument | undefined;

  if (!appointmentSnapshot.exists || appointment?.tenantId !== actor.tenantId) {
    throw new HttpsError('not-found', 'Agendamento não encontrado.');
  }

  if (actor.professionalId && actor.professionalId !== appointment.professionalId) {
    throw new HttpsError('permission-denied', 'Você não tem acesso a este agendamento.');
  }

  if (appointment.status !== 'pending' && appointment.status !== 'confirmed') {
    throw new HttpsError('failed-precondition', 'Este agendamento não pode ser reagendado.');
  }
  const assignments = await firestore
    .collection(collections.professionalProducts)
    .where('tenantId', '==', actor.tenantId)
    .where('productId', '==', appointment.productId)
    .where('active', '==', true)
    .get();

  const professionals = await Promise.all(
    assignments.docs.map(async (assignmentSnapshot) => {
      const assignment = assignmentSnapshot.data();

      if (
        assignment.tenantId !== actor.tenantId ||
        assignment.productId !== appointment.productId ||
        assignment.active !== true ||
        (actor.professionalId && assignment.professionalId !== actor.professionalId)
      ) {
        return undefined;
      }

      const snapshot = await firestore
        .collection(collections.professionals)
        .doc(String(assignment.professionalId))
        .get();

      const professional = snapshot.data();

      if (
        !snapshot.exists ||
        professional?.tenantId !== actor.tenantId ||
        professional.active !== true
      ) {
        return undefined;
      }

      return { id: snapshot.id, name: String(professional.name) };
    }),
  );

  return professionals.filter((professional): professional is { id: string; name: string } =>
    Boolean(professional),
  );
}
