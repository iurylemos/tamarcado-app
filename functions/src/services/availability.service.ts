import { Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { performance } from 'node:perf_hooks';
import { collections } from '../config/collections';
import type {
  AvailableSlot,
  ListAvailabilityInput,
  SearchAvailabilityInput,
  SearchAvailabilityResult,
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

function isAvailabilityDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    return isValidDateString(value);
  } catch (error: unknown) {
    if (error instanceof RangeError) return false;
    throw error;
  }
}

export async function listAvailableSlots(input: ListAvailabilityInput): Promise<AvailableSlot[]> {
  if (
    !input ||
    typeof input.businessSlug !== 'string' ||
    typeof input.productId !== 'string' ||
    !isAvailabilityDate(input.date)
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
  const now = Date.now();

  const professionals = (
    await Promise.all(
      assignedIds.map(async (professionalId) => {
        const snapshot = await firestore
          .collection(collections.professionals)
          .doc(professionalId)
          .get();
        const professional = snapshot.data() as Omit<ProfessionalRecord, 'id'> | undefined;

        return snapshot.exists &&
          professional?.tenantId === business.tenantId &&
          professional.active
          ? { ...professional, id: snapshot.id }
          : null;
      }),
    )
  ).filter((professional): professional is ProfessionalRecord => professional !== null);

  const professionalSlots = await Promise.all(
    professionals.map(async (professional) => {
      const professionalId = professional.id;
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
          .where('startsAt', '>=', Timestamp.fromDate(dayStart))
          .where('startsAt', '<', Timestamp.fromDate(dayEnd))
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
      const results: AvailableSlot[] = [];

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
            return intervalsOverlap(interval, {
              startsAt: appointmentStart,
              endsAt: appointmentEnd,
            });
          });

          const conflictingBlock = blocks.some((block) =>
            intervalsOverlap(interval, {
              startsAt: block.startsAt.toDate().getTime(),
              endsAt: block.endsAt.toDate().getTime(),
            }),
          );

          const conflictingReservation = reservations.some((bucketStart) =>
            intervalsOverlap(interval, {
              startsAt: bucketStart,
              endsAt: bucketStart + 300_000,
            }),
          );

          if (conflictingAppointment || conflictingBlock || conflictingReservation) continue;

          const localParts = getZonedDateTimeParts(startsAt, timezone);
          if (localParts.year !== Number(input.date.slice(0, 4))) continue;
          results.push({
            startsAt: startsAt.toISOString(),
            endsAt: endsAt.toISOString(),
            professionalId: professional.id,
            professionalName: professional.name,
          });
        }
      }

      return results;
    }),
  );

  return professionalSlots
    .flat()
    .sort((first, second) => first.startsAt.localeCompare(second.startsAt));
}

interface BoundedProfessionalSchedule {
  professional: ProfessionalRecord;
  hours: WorkingHoursDocument[];
  appointments: Array<Record<string, unknown>>;
  reservations: number[];
  blocks: BlockedPeriodDocument[];
}

interface BoundedAvailabilityContext {
  timezone: string;
  bookingInterval: number;
  durationMinutes: number;
  professionals: BoundedProfessionalSchedule[];
  now: number;
}

let coldStart = true;

function logAvailabilityDuration(
  operation: string,
  stage: string,
  startedAt: number,
  requestColdStart: boolean,
): void {
  logger.info('booking.performance', {
    operation,
    stage,
    durationMs: Math.round(performance.now() - startedAt),
    coldStart: requestColdStart,
  });
}

function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day) {
    throw new DomainError('INVALID_INPUT', 'Informe uma data válida.');
  }
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`;
}

function overlapsWindow(
  interval: { startsAt: number; endsAt: number },
  startsAt: Timestamp,
  endsAt: Timestamp,
): boolean {
  return intervalsOverlap(interval, {
    startsAt: startsAt.toDate().getTime(),
    endsAt: endsAt.toDate().getTime(),
  });
}

async function loadBoundedAvailabilityContext(
  input: SearchAvailabilityInput,
  requestColdStart: boolean,
): Promise<BoundedAvailabilityContext> {
  const sharedStartedAt = performance.now();
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

  const windowStart = localDateTimeToUtc(input.date, '00:00', timezone);
  const windowEnd = localDateTimeToUtc(addDays(input.date, 31), '00:00', timezone);
  const weekdays = [
    ...new Set(Array.from({ length: 31 }, (_, offset) => isoWeekday(addDays(input.date, offset)))),
  ];
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
      .where('startsAt', '<', Timestamp.fromDate(windowEnd))
      .where('endsAt', '>', Timestamp.fromDate(windowStart))
      .get(),
  ]);
  logAvailabilityDuration(
    'availability_search',
    'shared_data_resolution',
    sharedStartedAt,
    requestColdStart,
  );

  const assignedIds = assignmentsSnapshot.docs
    .map((document) => document.data())
    .filter(
      (assignment) =>
        assignment.tenantId === business.tenantId &&
        assignment.productId === product.id &&
        assignment.active,
    )
    .map((assignment) => String(assignment.professionalId));

  const conflictReadsStartedAt = performance.now();
  const professionals = (
    await Promise.all(
      assignedIds.map(async (professionalId) => {
        const snapshot = await firestore
          .collection(collections.professionals)
          .doc(professionalId)
          .get();
        const professional = snapshot.data() as Omit<ProfessionalRecord, 'id'> | undefined;

        return snapshot.exists &&
          professional?.tenantId === business.tenantId &&
          professional.active
          ? { ...professional, id: snapshot.id }
          : null;
      }),
    )
  ).filter((professional): professional is ProfessionalRecord => professional !== null);

  const schedules = await Promise.all(
    professionals.map(async (professional): Promise<BoundedProfessionalSchedule> => {
      const [hoursSnapshot, appointmentsSnapshot, reservationsSnapshot] = await Promise.all([
        firestore
          .collection(collections.workingHours)
          .where('tenantId', '==', business.tenantId)
          .where('professionalId', '==', professional.id)
          .where('dayOfWeek', 'in', weekdays)
          .where('active', '==', true)
          .get(),
        firestore
          .collection(collections.appointments)
          .where('tenantId', '==', business.tenantId)
          .where('professionalId', '==', professional.id)
          .where('status', 'in', ['pending', 'confirmed'])
          .where('startsAt', '<', Timestamp.fromDate(windowEnd))
          .where('endsAt', '>', Timestamp.fromDate(windowStart))
          .get(),
        firestore
          .collection(collections.bookingReservations)
          .where('tenantId', '==', business.tenantId)
          .where('professionalId', '==', professional.id)
          .where('bucketStartAt', '>=', Timestamp.fromDate(windowStart))
          .where('bucketStartAt', '<', Timestamp.fromDate(windowEnd))
          .get(),
      ]);

      return {
        professional,
        hours: hoursSnapshot.docs
          .map((document) => document.data() as WorkingHoursDocument)
          .filter(
            (item) =>
              item.tenantId === business.tenantId && item.professionalId === professional.id,
          ),
        appointments: appointmentsSnapshot.docs
          .map((document) => document.data())
          .filter(
            (item) =>
              item.tenantId === business.tenantId &&
              item.status !== 'cancelled' &&
              item.status !== 'completed',
          ),
        reservations: reservationsSnapshot.docs
          .map((document) => document.data())
          .filter(
            (item) =>
              item.tenantId === business.tenantId && item.professionalId === professional.id,
          )
          .map((item) => (item.bucketStartAt as Timestamp).toDate().getTime()),
        blocks: blocksSnapshot.docs
          .map((document) => document.data() as BlockedPeriodDocument)
          .filter(
            (item) =>
              item.tenantId === business.tenantId &&
              (!item.professionalId || item.professionalId === professional.id),
          ),
      };
    }),
  );
  logAvailabilityDuration(
    'availability_search',
    'conflict_reads',
    conflictReadsStartedAt,
    requestColdStart,
  );

  return {
    timezone,
    bookingInterval,
    durationMinutes: product.durationMinutes,
    professionals: schedules,
    now: Date.now(),
  };
}

function listSlotsForDate(context: BoundedAvailabilityContext, date: string): AvailableSlot[] {
  const dayStart = localDateTimeToUtc(date, '00:00', context.timezone).getTime();
  const dayEnd = localDateTimeToUtc(addDays(date, 1), '00:00', context.timezone).getTime();
  const weekday = isoWeekday(date);
  const results: AvailableSlot[] = [];

  for (const schedule of context.professionals) {
    const { professional } = schedule;
    const hours = schedule.hours.filter((item) => item.dayOfWeek === weekday && item.active);
    const appointments = schedule.appointments.filter((item) => {
      const startsAt = item.startsAt as Timestamp;
      const endsAt = item.endsAt as Timestamp;
      return overlapsWindow({ startsAt: dayStart, endsAt: dayEnd }, startsAt, endsAt);
    });
    const blocks = schedule.blocks.filter((item) =>
      overlapsWindow({ startsAt: dayStart, endsAt: dayEnd }, item.startsAt, item.endsAt),
    );
    const reservations = schedule.reservations.filter(
      (bucketStart) => bucketStart >= dayStart && bucketStart < dayEnd,
    );

    for (const workingHours of hours) {
      const opening = parseMinutes(workingHours.startLocalTime);
      const closing = parseMinutes(workingHours.endLocalTime);
      for (
        let startMinute = opening;
        startMinute + context.durationMinutes <= closing;
        startMinute += context.bookingInterval
      ) {
        const localTime = `${String(Math.floor(startMinute / 60)).padStart(2, '0')}:${String(startMinute % 60).padStart(2, '0')}`;
        let startsAt: Date;
        try {
          startsAt = localDateTimeToUtc(date, localTime, context.timezone);
        } catch (error: unknown) {
          if (error instanceof RangeError) continue;
          throw error;
        }
        const endsAt = new Date(startsAt.getTime() + context.durationMinutes * 60_000);
        const interval = { startsAt: startsAt.getTime(), endsAt: endsAt.getTime() };

        if (startsAt.getTime() <= context.now) continue;
        if (
          appointments.some((appointment) =>
            overlapsWindow(
              interval,
              appointment.startsAt as Timestamp,
              appointment.endsAt as Timestamp,
            ),
          )
        ) {
          continue;
        }
        if (blocks.some((block) => overlapsWindow(interval, block.startsAt, block.endsAt))) {
          continue;
        }
        if (
          reservations.some((bucketStart) =>
            intervalsOverlap(interval, {
              startsAt: bucketStart,
              endsAt: bucketStart + 300_000,
            }),
          )
        ) {
          continue;
        }

        results.push({
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          professionalId: professional.id,
          professionalName: professional.name,
        });
      }
    }
  }

  return results.sort((first, second) => first.startsAt.localeCompare(second.startsAt));
}

export async function searchAvailability(
  input: SearchAvailabilityInput,
): Promise<SearchAvailabilityResult> {
  if (
    !input ||
    typeof input.businessSlug !== 'string' ||
    typeof input.productId !== 'string' ||
    !isAvailabilityDate(input.date)
  ) {
    throw new DomainError('INVALID_INPUT', 'Informe empresa, serviço e uma data válida.');
  }

  const requestColdStart = coldStart;
  coldStart = false;
  const requestStartedAt = performance.now();
  const context = await loadBoundedAvailabilityContext(input, requestColdStart);
  const evaluationStartedAt = performance.now();

  for (let offset = 0; offset <= 30; offset += 1) {
    const date = addDays(input.date, offset);
    const slots = listSlotsForDate(context, date);
    if (slots.length > 0) {
      logAvailabilityDuration(
        'availability_search',
        'slot_evaluation',
        evaluationStartedAt,
        requestColdStart,
      );
      logAvailabilityDuration('availability_search', 'total', requestStartedAt, requestColdStart);
      return { date, slots };
    }
  }

  logAvailabilityDuration(
    'availability_search',
    'slot_evaluation',
    evaluationStartedAt,
    requestColdStart,
  );
  logAvailabilityDuration('availability_search', 'total', requestStartedAt, requestColdStart);
  return { date: null, slots: [] };
}

export interface RequestedSlotValidationInput {
  tenantId: string;
  professionalId: string;
  startsAt: Date;
  durationMinutes: number;
  timezone: string;
  bookingIntervalMinutes: number;
  coldStart?: boolean;
}

export async function isRequestedSlotAvailable(
  input: RequestedSlotValidationInput,
): Promise<boolean> {
  if (
    !Number.isInteger(input.durationMinutes) ||
    input.durationMinutes <= 0 ||
    !Number.isInteger(input.bookingIntervalMinutes) ||
    input.bookingIntervalMinutes < 5 ||
    input.bookingIntervalMinutes % 5 !== 0 ||
    input.startsAt.getTime() % 60_000 !== 0 ||
    input.startsAt.getTime() <= Date.now()
  ) {
    return false;
  }

  const local = getZonedDateTimeParts(input.startsAt, input.timezone);
  const date = `${local.year}-${String(local.month).padStart(2, '0')}-${String(local.day).padStart(2, '0')}`;
  const startsAtMs = input.startsAt.getTime();
  const endsAtMs = startsAtMs + input.durationMinutes * 60_000;
  const startsAt = localDateTimeToUtc(date, '00:00', input.timezone);
  const endsAt = localDateTimeToUtc(addDays(date, 1), '00:00', input.timezone);
  const requestColdStart = input.coldStart ?? coldStart;
  coldStart = false;
  const conflictReadsStartedAt = performance.now();
  const [hoursSnapshot, appointmentsSnapshot, reservationsSnapshot, blocksSnapshot] =
    await Promise.all([
      firestore
        .collection(collections.workingHours)
        .where('tenantId', '==', input.tenantId)
        .where('professionalId', '==', input.professionalId)
        .where('dayOfWeek', '==', isoWeekday(date))
        .where('active', '==', true)
        .get(),
      firestore
        .collection(collections.appointments)
        .where('tenantId', '==', input.tenantId)
        .where('professionalId', '==', input.professionalId)
        .where('status', 'in', ['pending', 'confirmed'])
        .where('startsAt', '<', Timestamp.fromMillis(endsAtMs))
        .where('endsAt', '>', Timestamp.fromMillis(startsAtMs))
        .get(),
      firestore
        .collection(collections.bookingReservations)
        .where('tenantId', '==', input.tenantId)
        .where('professionalId', '==', input.professionalId)
        .where(
          'bucketStartAt',
          '>=',
          Timestamp.fromMillis(Math.floor(startsAtMs / 300_000) * 300_000),
        )
        .where('bucketStartAt', '<', Timestamp.fromMillis(endsAtMs))
        .get(),
      firestore
        .collection(collections.blockedPeriods)
        .where('tenantId', '==', input.tenantId)
        .where('startsAt', '<', Timestamp.fromDate(endsAt))
        .where('endsAt', '>', Timestamp.fromDate(startsAt))
        .get(),
    ]);
  logAvailabilityDuration(
    'appointment_registration',
    'conflict_reads',
    conflictReadsStartedAt,
    requestColdStart,
  );

  const evaluationStartedAt = performance.now();
  const interval = { startsAt: startsAtMs, endsAt: endsAtMs };
  const validSchedule = hoursSnapshot.docs.some((document) => {
    const hours = document.data() as WorkingHoursDocument;
    if (hours.tenantId !== input.tenantId || hours.professionalId !== input.professionalId) {
      return false;
    }
    const opening = parseMinutes(hours.startLocalTime);
    const closing = parseMinutes(hours.endLocalTime);
    const minuteOfDay = local.hour * 60 + local.minute;
    return (
      minuteOfDay >= opening &&
      (minuteOfDay - opening) % input.bookingIntervalMinutes === 0 &&
      minuteOfDay + input.durationMinutes <= closing
    );
  });
  const hasAppointmentConflict = appointmentsSnapshot.docs.some((document) => {
    const appointment = document.data();
    return (
      appointment.tenantId === input.tenantId &&
      appointment.status !== 'cancelled' &&
      appointment.status !== 'completed' &&
      overlapsWindow(interval, appointment.startsAt as Timestamp, appointment.endsAt as Timestamp)
    );
  });
  const hasReservationConflict = reservationsSnapshot.docs.some((document) => {
    const reservation = document.data();
    const bucketStart = (reservation.bucketStartAt as Timestamp).toDate().getTime();
    return (
      reservation.tenantId === input.tenantId &&
      reservation.professionalId === input.professionalId &&
      intervalsOverlap(interval, {
        startsAt: bucketStart,
        endsAt: bucketStart + 300_000,
      })
    );
  });
  const hasBlockConflict = blocksSnapshot.docs.some((document) => {
    const block = document.data() as BlockedPeriodDocument;
    return (
      block.tenantId === input.tenantId &&
      (!block.professionalId || block.professionalId === input.professionalId) &&
      overlapsWindow(interval, block.startsAt, block.endsAt)
    );
  });
  logAvailabilityDuration(
    'appointment_registration',
    'slot_evaluation',
    evaluationStartedAt,
    requestColdStart,
  );

  return validSchedule && !hasAppointmentConflict && !hasReservationConflict && !hasBlockConflict;
}
