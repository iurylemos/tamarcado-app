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
import type {
  BoundedAvailabilityContext,
  BoundedProfessionalSchedule,
  ProfessionalRecord,
  RequestedSlotValidationInput,
  SearchAvailabilityBase,
  SearchAvailabilityWindow,
} from '../interfaces/availability.interface';
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
import type { Tenant } from '@shared/interfaces/tenant.interface';
import type { AppointmentDocument, BookingReservationDocument } from '../model/appointment.model';
import type { TenantDocument } from '../model/tenant.model';

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

  // Pad by a day each side so we don't need tenant.timezone before firing the blocks query.
  // Exact day filtering happens in memory below.
  const dateMs = Date.parse(`${input.date}T00:00:00Z`);
  const padStart = new Date(dateMs - 86_400_000);
  const padEnd = new Date(dateMs + 2 * 86_400_000);

  const [tenantSnapshot, product, assignmentsSnapshot, blocksSnapshot] = await Promise.all([
    firestore.collection(collections.tenants).doc(business.tenantId).get(),
    findBookableProduct(business, input.productId),
    firestore
      .collection(collections.professionalProducts)
      .where('tenantId', '==', business.tenantId)
      .where('productId', '==', input.productId)
      .where('active', '==', true)
      .select('professionalId')
      .get(),
    firestore
      .collection(collections.blockedPeriods)
      .where('tenantId', '==', business.tenantId)
      .where('startsAt', '<', Timestamp.fromDate(padEnd))
      .where('endsAt', '>', Timestamp.fromDate(padStart))
      .select('tenantId', 'professionalId', 'startsAt', 'endsAt')
      .get(),
  ]);

  const tenant = tenantSnapshot.data() as Tenant;

  if (!tenantSnapshot.exists || tenant?.active !== true) {
    throw new DomainError('NOT_BOOKABLE', 'Esta empresa não está aceitando agendamentos.');
  }

  const timezone = String(tenant.timezone);
  const bookingInterval = Number(tenant.bookingIntervalMinutes);

  if (!Number.isInteger(bookingInterval) || bookingInterval < 5 || bookingInterval % 5 !== 0) {
    throw new DomainError('TEMPORARY_FAILURE', 'O intervalo de agendamento da empresa é inválido.');
  }

  const weekday = isoWeekday(input.date);

  // Query already filters tenantId/productId/active, so only professionalId is needed.
  const assignedIds = [
    ...new Set(
      assignmentsSnapshot.docs
        .map((document) => String(document.data().professionalId))
        .filter((id) => !input.professionalId || id === input.professionalId),
    ),
  ];

  if (assignedIds.length === 0) return [];

  const dayStart = localDateTimeToUtc(input.date, '00:00', timezone);
  const dayEnd = localDateTimeToUtc(nextDate(input.date), '00:00', timezone);
  const dayStartMs = dayStart.getTime();
  const dayEndMs = dayEnd.getTime();
  const now = Date.now();

  // Blocks: filter once for the day (tenant-wide or professional-specific), not per professional.
  const dayBlocks = blocksSnapshot.docs
    .map((document) => document.data() as BlockedPeriodDocument)
    .filter((item) => {
      if (item.tenantId !== business.tenantId) return false;
      return (
        item.startsAt.toDate().getTime() < dayEndMs && item.endsAt.toDate().getTime() > dayStartMs
      );
    });

  const professionalRefs = assignedIds.map((id) =>
    firestore.collection(collections.professionals).doc(id),
  );

  // Schedule queries start immediately; they don't wait for the professional docs.
  const schedulesPromise = Promise.all(
    assignedIds.map(async (professionalId) => {
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
          .where('startsAt', '<', Timestamp.fromDate(dayEnd))
          .where('endsAt', '>', Timestamp.fromDate(dayStart))
          .get(),
        firestore
          .collection(collections.bookingReservations)
          .where('tenantId', '==', business.tenantId)
          .where('professionalId', '==', professionalId)
          .where('bucketStartAt', '>=', Timestamp.fromDate(dayStart))
          .where('bucketStartAt', '<', Timestamp.fromDate(dayEnd))
          .get(),
      ]);

      const hours = hoursSnapshot.docs.map((document) => document.data() as WorkingHoursDocument);

      const appointments = appointmentsSnapshot.docs.map((document) => {
        const appointmentData = document.data() as AppointmentDocument;

        return {
          startsAt: appointmentData.startsAt.toDate().getTime(),
          endsAt: appointmentData.endsAt.toDate().getTime(),
        };
      });

      const reservations = reservationsSnapshot.docs.map((document) => {
        const reservationData = document.data() as BookingReservationDocument;

        return reservationData.bucketStartAt.toDate().getTime();
      });

      return {
        hours,
        appointments,
        reservations,
      };
    }),
  );

  const [professionalSnapshots, schedules] = await Promise.all([
    firestore.getAll(...professionalRefs),
    schedulesPromise,
  ]);

  const results: AvailableSlot[] = [];

  for (const [index, professionalDocument] of professionalSnapshots.entries()) {
    const data = professionalDocument.data() as Omit<ProfessionalRecord, 'id'> | undefined;

    if (
      !professionalDocument.exists ||
      data?.tenantId !== business.tenantId ||
      !data.active ||
      !schedules[index]
    ) {
      continue;
    }

    const professional: ProfessionalRecord = { ...data, id: professionalDocument.id };
    const { hours, appointments, reservations } = schedules[index];

    const blocks = dayBlocks
      .filter((item) => !item.professionalId || item.professionalId === professional.id)
      .map((item) => ({
        startsAt: item.startsAt.toDate().getTime(),
        endsAt: item.endsAt.toDate().getTime(),
      }));

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

        if (appointments.some((appointment) => intervalsOverlap(interval, appointment))) continue;
        if (blocks.some((block) => intervalsOverlap(interval, block))) continue;
        if (
          reservations.some((bucketStart) =>
            intervalsOverlap(interval, { startsAt: bucketStart, endsAt: bucketStart + 300_000 }),
          )
        ) {
          continue;
        }

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
  }

  return results.sort((first, second) => first.startsAt.localeCompare(second.startsAt));
}

function logAvailabilityDuration(
  operation: string,
  stage: string,
  startedAt: number,
  correlationId?: string,
): void {
  logger.info('booking.performance', {
    operation,
    stage,
    durationMs: Math.round(performance.now() - startedAt),
    ...(correlationId ? { correlationId } : {}),
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

async function loadSearchBase(input: SearchAvailabilityInput): Promise<SearchAvailabilityBase> {
  const productPromise = firestore.collection(collections.products).doc(input.productId).get();
  // O tenant vem do próprio produto e é validado contra a empresa depois.
  const tenantPromise = productPromise.then((snapshot) => {
    const tenantId = (snapshot.data() as { tenantId?: string } | undefined)?.tenantId;

    return tenantId ? firestore.collection(collections.tenants).doc(tenantId).get() : null;
  });

  const [business, productSnapshot, tenantSnapshot, assignmentsSnapshot] = await Promise.all([
    findPublicBusiness(input.businessSlug),
    productPromise,
    tenantPromise,
    firestore
      .collection(collections.professionalProducts)
      .where('productId', '==', input.productId)
      .where('active', '==', true)
      .select('tenantId', 'professionalId')
      .get(),
  ]);

  const product = productSnapshot.data() as
    { tenantId: string; active: boolean; durationMinutes: number } | undefined;

  if (!product || product.tenantId !== business.tenantId) {
    throw new DomainError('NOT_FOUND', 'Serviço não encontrado para esta empresa.');
  }

  if (product.active !== true) {
    throw new DomainError('NOT_BOOKABLE', 'Este serviço não está disponível.');
  }

  const tenant = tenantSnapshot?.data() as TenantDocument | undefined;

  if (!tenantSnapshot?.exists || tenant?.active !== true) {
    throw new DomainError('NOT_BOOKABLE', 'Esta empresa não está aceitando agendamentos.');
  }

  const bookingInterval = Number(tenant.bookingIntervalMinutes);

  if (!Number.isInteger(bookingInterval) || bookingInterval < 5 || bookingInterval % 5 !== 0) {
    throw new DomainError('TEMPORARY_FAILURE', 'O intervalo de agendamento da empresa é inválido.');
  }

  return {
    tenantId: business.tenantId,
    timezone: String(tenant.timezone),
    bookingInterval,
    durationMinutes: product.durationMinutes,
    assignedIds: [
      ...new Set(
        assignmentsSnapshot.docs
          .map((document) => document.data())
          .filter((data) => data.tenantId === business.tenantId)
          .map((data) => String(data.professionalId))
          .filter(Boolean),
      ),
    ],
  };
}

async function loadActiveProfessionals(
  tenantId: string,
  assignedIds: string[],
): Promise<Map<string, ProfessionalRecord>> {
  if (assignedIds.length === 0) return new Map();

  const snapshots = await firestore.getAll(
    ...assignedIds.map((id) => firestore.collection(collections.professionals).doc(id)),
    { fieldMask: ['tenantId', 'active', 'name'] },
  );

  return new Map(
    snapshots
      .filter((snapshot) => snapshot.exists)
      .map((snapshot) => ({
        ...(snapshot.data() as Omit<ProfessionalRecord, 'id'>),
        id: snapshot.id,
      }))
      .filter((professional) => professional.tenantId === tenantId && professional.active === true)
      .map((professional) => [professional.id, professional]),
  );
}

async function loadSearchWindow(
  base: SearchAvailabilityBase,
  startDate: string,
  fromOffset: number,
  toOffset: number,
  professionalIds: string[],
): Promise<SearchAvailabilityWindow> {
  const { tenantId, timezone } = base;
  const windowStart = Timestamp.fromDate(
    localDateTimeToUtc(addDays(startDate, fromOffset), '00:00', timezone),
  );
  const windowEnd = Timestamp.fromDate(
    localDateTimeToUtc(addDays(startDate, toOffset + 1), '00:00', timezone),
  );
  const weekdays = [
    ...new Set(
      Array.from({ length: toOffset - fromOffset + 1 }, (_, index) =>
        isoWeekday(addDays(startDate, fromOffset + index)),
      ),
    ),
  ];

  const blocksPromise = firestore
    .collection(collections.blockedPeriods)
    .where('tenantId', '==', tenantId)
    .where('startsAt', '<', windowEnd)
    .where('endsAt', '>', windowStart)
    .select('tenantId', 'professionalId', 'startsAt', 'endsAt')
    .get();

  const schedulesPromise = Promise.all(
    professionalIds.map(async (professionalId) => {
      const [hoursSnapshot, appointmentsSnapshot, reservationsSnapshot] = await Promise.all([
        firestore
          .collection(collections.workingHours)
          .where('tenantId', '==', tenantId)
          .where('professionalId', '==', professionalId)
          .where('dayOfWeek', 'in', weekdays)
          .where('active', '==', true)
          .select('dayOfWeek', 'active', 'startLocalTime', 'endLocalTime')
          .get(),

        firestore
          .collection(collections.appointments)
          .where('tenantId', '==', tenantId)
          .where('professionalId', '==', professionalId)
          .where('status', 'in', ['pending', 'confirmed'])
          .where('startsAt', '<', windowEnd)
          .where('endsAt', '>', windowStart)
          .select('startsAt', 'endsAt')
          .get(),

        firestore
          .collection(collections.bookingReservations)
          .where('tenantId', '==', tenantId)
          .where('professionalId', '==', professionalId)
          .where('bucketStartAt', '>=', windowStart)
          .where('bucketStartAt', '<', windowEnd)
          .select('bucketStartAt')
          .get(),
      ]);

      return [
        professionalId,
        {
          hours: hoursSnapshot.docs.map((document) => document.data() as WorkingHoursDocument),
          appointments: appointmentsSnapshot.docs.map(
            (document) => document.data() as AppointmentDocument,
          ),
          reservations: reservationsSnapshot.docs.map((document) =>
            (document.data() as BookingReservationDocument).bucketStartAt.toDate().getTime(),
          ),
        },
      ] as const;
    }),
  );

  const [blocksSnapshot, schedules] = await Promise.all([blocksPromise, schedulesPromise]);

  return {
    schedules: new Map(schedules),
    blocks: blocksSnapshot.docs
      .map((document) => document.data() as BlockedPeriodDocument)
      .filter((item) => item.tenantId === tenantId),
  };
}

function buildContext(
  base: SearchAvailabilityBase,
  professionals: Map<string, ProfessionalRecord>,
  window: SearchAvailabilityWindow,
): BoundedAvailabilityContext {
  const schedules: BoundedProfessionalSchedule[] = [];

  for (const [id, professional] of professionals) {
    const schedule = window.schedules.get(id);

    if (!schedule) continue;

    schedules.push({
      professional,
      ...schedule,
      blocks: window.blocks.filter((item) => !item.professionalId || item.professionalId === id),
    });
  }

  return {
    timezone: base.timezone,
    bookingInterval: base.bookingInterval,
    durationMinutes: base.durationMinutes,
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

        const checkAppointments = appointments.some((appointment) =>
          overlapsWindow(
            interval,
            appointment.startsAt as Timestamp,
            appointment.endsAt as Timestamp,
          ),
        );

        if (checkAppointments) {
          continue;
        }

        const checkBlocks = blocks.some((block) =>
          overlapsWindow(interval, block.startsAt, block.endsAt),
        );

        if (checkBlocks) {
          continue;
        }

        const checkReservations = reservations.some((bucketStart) =>
          intervalsOverlap(interval, {
            startsAt: bucketStart,
            endsAt: bucketStart + 300_000,
          }),
        );

        if (checkReservations) {
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

function findFirstDay(
  context: BoundedAvailabilityContext,
  fromOffset: number,
  toOffset: number,
  input: SearchAvailabilityInput,
): SearchAvailabilityResult | null {
  for (let offset = fromOffset; offset <= toOffset; offset += 1) {
    const date = addDays(input.date, offset);
    const slots = listSlotsForDate(context, date);

    if (slots.length > 0) return { date, slots };
  }

  return null;
}

export async function searchAvailability(
  input: SearchAvailabilityInput,
): Promise<SearchAvailabilityResult> {
  const FIRST_SEARCH_WINDOW_DAYS = 7;
  const SEARCH_HORIZON_DAYS = 31;

  if (
    !input ||
    typeof input.businessSlug !== 'string' ||
    typeof input.productId !== 'string' ||
    !isAvailabilityDate(input.date)
  ) {
    throw new DomainError('INVALID_INPUT', 'Informe empresa, serviço e uma data válida.');
  }

  const requestStartedAt = performance.now();
  const sharedStartedAt = performance.now();

  const base = await loadSearchBase(input);

  logAvailabilityDuration('availability_search', 'shared_data_resolution', sharedStartedAt);

  const conflictReadsStartedAt = performance.now();

  const [professionals, firstWindow] = await Promise.all([
    loadActiveProfessionals(base.tenantId, base.assignedIds),
    loadSearchWindow(base, input.date, 0, FIRST_SEARCH_WINDOW_DAYS - 1, base.assignedIds),
  ]);

  logAvailabilityDuration('availability_search', 'conflict_reads', conflictReadsStartedAt);

  const evaluationStartedAt = performance.now();

  let result = findFirstDay(
    buildContext(base, professionals, firstWindow),
    0,
    FIRST_SEARCH_WINDOW_DAYS - 1,
    input,
  );

  if (!result && professionals.size > 0) {
    const restWindow = await loadSearchWindow(
      base,
      input.date,
      FIRST_SEARCH_WINDOW_DAYS,
      SEARCH_HORIZON_DAYS - 1,
      [...professionals.keys()],
    );

    result = findFirstDay(
      buildContext(base, professionals, restWindow),
      FIRST_SEARCH_WINDOW_DAYS,
      SEARCH_HORIZON_DAYS - 1,
      input,
    );
  }

  logAvailabilityDuration('availability_search', 'slot_evaluation', evaluationStartedAt);

  logAvailabilityDuration('availability_search', 'total', requestStartedAt);

  return result ?? { date: null, slots: [] };
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
    input.correlationId,
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
    const appointment = document.data() as AppointmentDocument;
    return (
      appointment.tenantId === input.tenantId &&
      appointment.status !== 'cancelled' &&
      appointment.status !== 'completed' &&
      overlapsWindow(interval, appointment.startsAt, appointment.endsAt)
    );
  });

  const hasReservationConflict = reservationsSnapshot.docs.some((document) => {
    const reservation = document.data() as BookingReservationDocument;
    const bucketStart = reservation.bucketStartAt.toDate().getTime();

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
    input.correlationId,
  );

  return validSchedule && !hasAppointmentConflict && !hasReservationConflict && !hasBlockConflict;
}
