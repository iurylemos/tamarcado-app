import { createHash } from 'node:crypto';
import { Timestamp, Transaction } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { performance } from 'node:perf_hooks';
import type { CreatePublicAppointmentInput } from '../../../shared/domain/interfaces/appointment.interface';
import { normalizeBrazilianPhone } from '../../../shared/domain/phone';
import { fiveMinuteBucketStarts } from '../../../shared/domain/interval';
import { calculateCommissionCents } from '../../../shared/domain/money';
import { getZonedDateTimeParts, isValidDateString } from '../../../shared/domain/timezone';
import { DomainError } from '../../../shared/domain/errors';
import { collections } from '../config/collections';
import { firestore, professionalProductId } from './firestore.service';
import { findBookableProduct, findPublicBusiness } from './public-catalog.service';
import { isRequestedSlotAvailable } from './availability.service';
import { isFirestoreIndexUnavailableError } from './firestore-error.service';

let bookingColdStart = true;

const validName = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length <= 100;
const parseCallableInput = (value: unknown): CreatePublicAppointmentInput => {
  if (typeof value !== 'object' || value === null) {
    throw new HttpsError('invalid-argument', 'Os dados do agendamento estão incompletos.');
  }
  const input = value as Record<string, unknown>;
  if (
    typeof input.businessSlug !== 'string' ||
    typeof input.productId !== 'string' ||
    typeof input.professionalId !== 'string' ||
    typeof input.startsAt !== 'string' ||
    typeof input.customerPhone !== 'string' ||
    !validName(input.customerName) ||
    input.customerName.trim().length === 0 ||
    (input.whatsappOptIn !== undefined && typeof input.whatsappOptIn !== 'boolean')
  ) {
    throw new HttpsError('invalid-argument', 'Revise os dados do agendamento e tente novamente.');
  }
  return {
    businessSlug: input.businessSlug,
    productId: input.productId,
    professionalId: input.professionalId,
    startsAt: input.startsAt,
    customerPhone: input.customerPhone,
    customerName: input.customerName.trim(),
    whatsappOptIn: input.whatsappOptIn === true,
  };
};

export function reservationDocumentId(
  tenantId: string,
  professionalId: string,
  bucketStartMs: number,
): string {
  return createHash('sha256')
    .update(`${tenantId}|${professionalId}|${bucketStartMs}`)
    .digest('hex');
}

export async function createPublicAppointment(
  value: unknown,
): Promise<{ appointmentId: string; status: 'pending' }> {
  const input = parseCallableInput(value);
  const phoneE164 = normalizeBrazilianPhone(input.customerPhone);

  if (!phoneE164) {
    throw new HttpsError('invalid-argument', 'Informe um telefone brasileiro válido com DDD.');
  }

  const startsAt = new Date(input.startsAt);

  if (!Number.isFinite(startsAt.getTime()) || startsAt.toISOString() !== input.startsAt) {
    throw new HttpsError('invalid-argument', 'Escolha um horário válido para o agendamento.');
  }

  const requestStartedAt = performance.now();
  const requestColdStart = bookingColdStart;
  bookingColdStart = false;

  try {
    const resolutionStartedAt = performance.now();
    const business = await findPublicBusiness(input.businessSlug);
    const [tenantSnapshot, product, professionalSnapshot] = await Promise.all([
      firestore.collection(collections.tenants).doc(business.tenantId).get(),
      findBookableProduct(business, input.productId),
      firestore.collection(collections.professionals).doc(input.professionalId).get(),
    ]);
    const tenant = tenantSnapshot.data();
    const professional = professionalSnapshot.data();

    if (
      !tenantSnapshot.exists ||
      tenant?.active !== true ||
      !professionalSnapshot.exists ||
      professional?.tenantId !== business.tenantId ||
      professional.active !== true
    ) {
      throw new HttpsError('failed-precondition', 'Empresa, serviço ou profissional indisponível.');
    }

    const associationId = professionalProductId(
      business.tenantId,
      input.professionalId,
      product.id,
    );

    const association = await firestore
      .collection(collections.professionalProducts)
      .doc(associationId)
      .get();

    if (
      !association.exists ||
      association.data()?.tenantId !== business.tenantId ||
      association.data()?.active !== true
    ) {
      throw new HttpsError(
        'failed-precondition',
        'Este profissional não atende o serviço selecionado.',
      );
    }
    logger.info('booking.performance', {
      operation: 'appointment_registration',
      stage: 'shared_data_resolution',
      durationMs: Math.round(performance.now() - resolutionStartedAt),
      coldStart: requestColdStart,
    });

    const timezone = String(tenant.timezone);
    const bookingIntervalMinutes = Number(tenant.bookingIntervalMinutes);
    if (
      !Number.isInteger(bookingIntervalMinutes) ||
      bookingIntervalMinutes < 5 ||
      bookingIntervalMinutes % 5 !== 0
    ) {
      throw new HttpsError('internal', 'O intervalo de agendamento da empresa é inválido.');
    }
    const local = getZonedDateTimeParts(startsAt, timezone);
    const localDate = `${local.year}-${String(local.month).padStart(2, '0')}-${String(local.day).padStart(2, '0')}`;

    if (!isValidDateString(localDate)) {
      throw new HttpsError('invalid-argument', 'A data escolhida não é válida.');
    }

    const slotAvailable = await isRequestedSlotAvailable({
      tenantId: business.tenantId,
      professionalId: input.professionalId,
      startsAt,
      durationMinutes: product.durationMinutes,
      timezone,
      bookingIntervalMinutes,
      coldStart: requestColdStart,
    });

    if (!slotAvailable) {
      throw new HttpsError(
        'already-exists',
        'Este horário não está mais disponível. Escolha outro horário.',
      );
    }

    const endsAt = new Date(startsAt.getTime() + product.durationMinutes * 60_000);

    if (startsAt >= endsAt) {
      throw new HttpsError('invalid-argument', 'O horário final deve ser posterior ao inicial.');
    }

    const buckets = fiveMinuteBucketStarts({
      startsAt: startsAt.getTime(),
      endsAt: endsAt.getTime(),
    });

    const reservationRefs = buckets.map((bucket) =>
      firestore
        .collection(collections.bookingReservations)
        .doc(reservationDocumentId(business.tenantId, input.professionalId, bucket)),
    );

    const appointmentId = reservationDocumentId(
      business.tenantId,
      input.professionalId,
      buckets[0] ?? 0,
    );

    const appointmentRef = firestore.collection(collections.appointments).doc(appointmentId);
    const notificationJobRef = firestore
      .collection(collections.appointmentNotificationJobs)
      .doc(appointmentId);

    const transactionStartedAt = performance.now();
    await firestore.runTransaction(async (transaction: Transaction): Promise<void> => {
      const reservations = await Promise.all(
        reservationRefs.map((reference) => transaction.get(reference)),
      );

      if (reservations.some((reservation) => reservation.exists)) {
        throw new HttpsError(
          'already-exists',
          'Este horário acabou de ser reservado. Escolha outro horário.',
        );
      }

      const createdAt = Timestamp.now();

      const commissionAmountCents = calculateCommissionCents(
        product.priceCents,
        product.commissionType,
        product.commissionValue,
      );

      transaction.create(appointmentRef, {
        tenantId: business.tenantId,
        customerPhoneE164: phoneE164,
        customerName: input.customerName?.trim() || undefined,
        productId: product.id,
        professionalId: input.professionalId,
        professionalNameSnapshot: professional.name,
        startsAt: Timestamp.fromDate(startsAt),
        endsAt: Timestamp.fromDate(endsAt),
        durationMinutes: product.durationMinutes,
        status: 'pending',
        productNameSnapshot: product.name,
        productImageUrlSnapshot: product.imageUrl,
        productPriceCentsSnapshot: product.priceCents,
        commissionTypeSnapshot: product.commissionType,
        commissionValueSnapshot: product.commissionValue,
        commissionAmountCentsSnapshot: commissionAmountCents,
        whatsappOptIn: input.whatsappOptIn === true,
        createdAt,
        updatedAt: createdAt,
        createdBy: 'public-customer',
      });
      buckets.forEach((bucket, index) => {
        transaction.create(reservationRefs[index]!, {
          tenantId: business.tenantId,
          professionalId: input.professionalId,
          appointmentId,
          bucketStartAt: Timestamp.fromMillis(bucket),
          createdAt,
        });
      });
      transaction.create(notificationJobRef, {
        appointmentId,
        tenantId: business.tenantId,
        status: 'pending',
        createdAt,
        updatedAt: createdAt,
      });
    });

    logger.info('booking.performance', {
      operation: 'appointment_registration',
      stage: 'transaction',
      durationMs: Math.round(performance.now() - transactionStartedAt),
      coldStart: requestColdStart,
    });
    return { appointmentId, status: 'pending' };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    if (isFirestoreIndexUnavailableError(error)) {
      throw new HttpsError(
        'unavailable',
        'Estamos atualizando a disponibilidade dos horários. Tente novamente em alguns minutos.',
      );
    }
    if (error instanceof DomainError) {
      const code =
        error.code === 'NOT_FOUND'
          ? 'not-found'
          : error.code === 'NOT_BOOKABLE'
            ? 'failed-precondition'
            : error.code === 'INVALID_INPUT'
              ? 'invalid-argument'
              : 'internal';
      throw new HttpsError(code, error.message);
    }
    throw error;
  } finally {
    logger.info('booking.performance', {
      operation: 'appointment_registration',
      stage: 'total',
      durationMs: Math.round(performance.now() - requestStartedAt),
      coldStart: requestColdStart,
    });
  }
}

export function isLocalStartOnBookingInterval(
  startsAt: Date,
  businessDate: string,
  timezone: string,
  intervalMinutes: number,
  openingTime: string,
): boolean {
  if (
    !isValidDateString(businessDate) ||
    !Number.isInteger(intervalMinutes) ||
    intervalMinutes < 5
  ) {
    return false;
  }

  const local = getZonedDateTimeParts(startsAt, timezone);
  const date = `${local.year}-${String(local.month).padStart(2, '0')}-${String(local.day).padStart(2, '0')}`;

  if (date !== businessDate) return false;

  const [openingHour, openingMinute] = openingTime.split(':').map(Number);
  const openingMinutes = (openingHour ?? 0) * 60 + (openingMinute ?? 0);
  const offset = local.hour * 60 + local.minute - openingMinutes;

  return offset >= 0 && offset % intervalMinutes === 0;
}

export function toBusinessLocalDate(startsAt: Date, timezone: string): string {
  const local = getZonedDateTimeParts(startsAt, timezone);
  return `${local.year}-${String(local.month).padStart(2, '0')}-${String(local.day).padStart(2, '0')}`;
}
