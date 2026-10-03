import { Timestamp } from 'firebase-admin/firestore';
import { collections } from '../config/collections';
import type {
  AvailableSlot,
  ListAvailabilityInput,
} from '../../../shared/domain/interfaces/availability.interface';
import type { BlockedPeriodDocument, WorkingHoursDocument } from '../model/availability.model';
import { DomainError } from '../../../shared/domain/errors';
import { intervalsOverlap } from '../../../shared/domain/interval';
import {
  getZonedDateTimeParts,
  isValidDateString,
  isoWeekday,
  localDateTimeToUtc,
} from '../../../shared/domain/timezone';
import { firestore } from './firestore.service';
import { findBookableProduct, findPublicBusiness } from './public-catalog.service';

interface ProfessionalRecord {
  id: string;
  tenantId: string;
  name: string;
  active: boolean;
}

function nextDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);

  if (!year || !month || !day) {
    throw new DomainError('INVALID_INPUT', 'Informe uma data válida.');
  }

  const next = new Date(Date.UTC(year, month - 1, day + 1));

  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`;
}

function parseMinutes(value: string): number {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);

  if (!match) {
    throw new DomainError(
      'TEMPORARY_FAILURE',
      'A agenda da empresa está configurada incorretamente.',
    );
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

export async function listAvailableSlots(input: ListAvailabilityInput): Promise<AvailableSlot[]> {
  if (
    !input ||
    typeof input.businessSlug !== 'string' ||
    typeof input.productId !== 'string' ||
    !isValidDateString(input.date)
  ) {
    throw new DomainError('INVALID_INPUT', 'Informe empresa, serviço e uma data válida.');
  }

  const business = await findPublicBusiness(input.businessSlug);
  const [tenantSnapshot, product] = await Promise.all([
    firestore.collection(collections.tenants).doc(business.tenantId).get(),
    findBookableProduct(business, input.productId),
  ]);
  const tenant = tenantSnapshot.data();

  if (!tenantSnapshot.exists || tenant?.active !== true) {
    throw new DomainError('NOT_BOOKABLE', 'Esta empresa não está aceitando agendamentos.');
  }

  const timezone = String(tenant.timezone);
  const bookingInterval = Number(tenant.bookingIntervalMinutes);

  if (!Number.isInteger(bookingInterval) || bookingInterval < 5 || bookingInterval % 5 !== 0) {
    throw new DomainError('TEMPORARY_FAILURE', 'O intervalo de agendamento da empresa é inválido.');
  }

  const weekday = isoWeekday(input.date);
  const [assignmentsSnapshot, blocksSnapshot] = await Promise.all([
    firestore
      .collection(collections.professionalProducts)
      .where('tenantId', '==', business.tenantId)
      .where('productId', '==', product.id)
      .where('active', '==', true)
      .get(),
    firestore
      .collection(collections.blockedPeriods)
      .where('tenantId', '==', business.tenantId)
      .get(),
  ]);

  const assignedIds = assignmentsSnapshot.docs
    .map((document) => document.data())
    .filter(
      (assignment) =>
        assignment.tenantId === business.tenantId &&
        assignment.productId === product.id &&
        assignment.active,
    )
    .map((assignment) => String(assignment.professionalId))
    .filter((id) => !input.professionalId || id === input.professionalId);

  const dayStart = localDateTimeToUtc(input.date, '00:00', timezone);
  const dayEnd = localDateTimeToUtc(nextDate(input.date), '00:00', timezone);
  const results: AvailableSlot[] = [];
  const now = Date.now();

  for (const professionalId of assignedIds) {
    const professionalSnapshot = await firestore
      .collection(collections.professionals)
      .doc(professionalId)
      .get();
    const professional = professionalSnapshot.data() as ProfessionalRecord | undefined;
    if (
      !professionalSnapshot.exists ||
      professional?.tenantId !== business.tenantId ||
      !professional.active
    )
      continue;

    const [hoursSnapshot, appointmentsSnapshot, reservationsSnapshot] = await Promise.all([
      firestore
        .collection(collections.workingHours)
        .where('tenantId', '==', business.tenantId)
        .where('professionalId', '==', professionalId)
        .where('dayOfWeek', '==', weekday)
        .where('active', '==', true)
        .get(),
      firestore
        .collection(collections.appointments)
        .where('tenantId', '==', business.tenantId)
        .where('professionalId', '==', professionalId)
        .where('status', 'in', ['pending', 'confirmed'])
        .get(),
      firestore
        .collection(collections.bookingReservations)
        .where('tenantId', '==', business.tenantId)
        .where('professionalId', '==', professionalId)
        .where('bucketStartAt', '>=', Timestamp.fromDate(dayStart))
        .where('bucketStartAt', '<', Timestamp.fromDate(dayEnd))
        .get(),
    ]);

    const hours = hoursSnapshot.docs
      .map((document) => document.data() as WorkingHoursDocument)
      .filter(
        (item) => item.tenantId === business.tenantId && item.professionalId === professionalId,
      );
    const appointments = appointmentsSnapshot.docs
      .map((document) => document.data())
      .filter(
        (item) =>
          item.tenantId === business.tenantId &&
          item.status !== 'cancelled' &&
          item.status !== 'completed',
      );
    const reservations = reservationsSnapshot.docs
      .map((document) => document.data())
      .filter(
        (item) => item.tenantId === business.tenantId && item.professionalId === professionalId,
      )
      .map((item) => (item.bucketStartAt as Timestamp).toDate().getTime());
    const blocks = blocksSnapshot.docs
      .map((document) => document.data() as BlockedPeriodDocument)
      .filter((item) => {
        if (
          item.tenantId !== business.tenantId ||
          (item.professionalId && item.professionalId !== professionalId)
        ) {
          return false;
        }

        const startsAt = item.startsAt.toDate().getTime();
        const endsAt = item.endsAt.toDate().getTime();
        return startsAt < dayEnd.getTime() && endsAt > dayStart.getTime();
      });

    for (const workingHours of hours) {
      const opening = parseMinutes(workingHours.startLocalTime);
      const closing = parseMinutes(workingHours.endLocalTime);
      for (
        let startMinute = opening;
        startMinute + product.durationMinutes <= closing;
        startMinute += bookingInterval
      ) {
        const localTime = `${String(Math.floor(startMinute / 60)).padStart(2, '0')}:${String(startMinute % 60).padStart(2, '0')}`;
        const startsAt = localDateTimeToUtc(input.date, localTime, timezone);
        const endsAt = new Date(startsAt.getTime() + product.durationMinutes * 60_000);
        const interval = { startsAt: startsAt.getTime(), endsAt: endsAt.getTime() };

        if (startsAt.getTime() <= now) continue;

        const conflictingAppointment = appointments.some((appointment) => {
          const appointmentStart = (appointment.startsAt as Timestamp).toDate().getTime();
          const appointmentEnd = (appointment.endsAt as Timestamp).toDate().getTime();
          return intervalsOverlap(interval, { startsAt: appointmentStart, endsAt: appointmentEnd });
        });

        const conflictingBlock = blocks.some((block) =>
          intervalsOverlap(interval, {
            startsAt: block.startsAt.toDate().getTime(),
            endsAt: block.endsAt.toDate().getTime(),
          }),
        );

        const conflictingReservation = reservations.some(
          (bucketStart) => bucketStart >= interval.startsAt && bucketStart < interval.endsAt,
        );

        if (conflictingAppointment || conflictingBlock || conflictingReservation) continue;

        const localParts = getZonedDateTimeParts(startsAt, timezone);
        if (localParts.year !== Number(input.date.slice(0, 4))) continue;
        results.push({
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          professionalId,
          professionalName: professional.name,
        });
      }
    }
  }

  return results.sort((first, second) => first.startsAt.localeCompare(second.startsAt));
}
