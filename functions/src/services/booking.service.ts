import { createHash, randomUUID } from 'node:crypto';
import { Timestamp, Transaction } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { performance } from 'node:perf_hooks';
import type { CreatePublicAppointmentInput } from '../../../shared/domain/interfaces/appointment.interface';
import { normalizeBrazilianPhone } from '../../../shared/domain/phone';
import { fiveMinuteBucketStarts } from '../../../shared/domain/interval';
import { calculateCommissionCents } from '../../../shared/domain/money';
import { resolveProductPriceCents } from '../../../shared/domain/product-price';
import { getZonedDateTimeParts, isValidDateString } from '../../../shared/domain/timezone';
import { DomainError } from '../../../shared/domain/errors';
import type {
  ProductCustomizationAttribute,
  ProductCustomizationSelection,
  ProductImage,
} from '../../../shared/domain/interfaces/product.interface';
import { collections } from '../config/collections';
import { firestore, professionalProductId } from './firestore.service';
import { findBookableProduct, findPublicBusiness } from './public-catalog.service';
import { isRequestedSlotAvailable } from './availability.service';
import { isFirestoreIndexUnavailableError } from './firestore-error.service';
import {
  defaultProductImages,
  productGalleryCombinationKey,
  productGalleryDocumentId,
  type ProductGalleryDocument,
} from '../model/product-gallery.model';

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
  let customizationSelections: ProductCustomizationSelection[] | undefined;
  if (input.customizationSelections !== undefined) {
    if (!Array.isArray(input.customizationSelections)) {
      throw new HttpsError('invalid-argument', 'As opções selecionadas são inválidas.');
    }
    customizationSelections = input.customizationSelections.map((value) => {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new HttpsError('invalid-argument', 'As opções selecionadas são inválidas.');
      }
      const selection = value as Record<string, unknown>;
      if (
        typeof selection.attributeId !== 'string' ||
        !selection.attributeId.trim() ||
        typeof selection.optionId !== 'string' ||
        !selection.optionId.trim()
      ) {
        throw new HttpsError('invalid-argument', 'As opções selecionadas são inválidas.');
      }
      return { attributeId: selection.attributeId, optionId: selection.optionId };
    });
  }
  if (
    input.selectedImageId !== undefined &&
    (typeof input.selectedImageId !== 'string' ||
      !input.selectedImageId.trim() ||
      input.selectedImageId.length > 100)
  ) {
    throw new HttpsError('invalid-argument', 'A imagem selecionada é inválida.');
  }
  return {
    businessSlug: input.businessSlug,
    productId: input.productId,
    professionalId: input.professionalId,
    startsAt: input.startsAt,
    customerPhone: input.customerPhone,
    customerName: input.customerName.trim(),
    whatsappOptIn: input.whatsappOptIn === true,
    ...(customizationSelections !== undefined ? { customizationSelections } : {}),
    ...(input.selectedImageId !== undefined ? { selectedImageId: input.selectedImageId } : {}),
  };
};

function validateCustomizationSelections(
  attributes: ProductCustomizationAttribute[] | undefined,
  selections: ProductCustomizationSelection[] | undefined,
): {
  selections: ProductCustomizationSelection[];
  snapshot?: Array<{
    attributeId: string;
    attributeLabel: string;
    optionId: string;
    optionLabel: string;
  }>;
} {
  if (!attributes?.length) {
    if (selections?.length) {
      throw new HttpsError('invalid-argument', 'Este serviço não possui opções de personalização.');
    }
    return { selections: [] };
  }
  if (!selections || selections.length !== attributes.length) {
    throw new HttpsError(
      'invalid-argument',
      'Selecione exatamente uma opção para cada atributo do serviço.',
    );
  }
  const selectionByAttribute = new Map<string, string>();
  for (const selection of selections) {
    if (selectionByAttribute.has(selection.attributeId)) {
      throw new HttpsError('invalid-argument', 'A seleção não pode conter atributos duplicados.');
    }
    selectionByAttribute.set(selection.attributeId, selection.optionId);
  }
  const snapshot = attributes.map((attribute) => {
    const optionId = selectionByAttribute.get(attribute.id);
    const option = attribute.options.find((candidate) => candidate.id === optionId);
    if (!option) {
      throw new HttpsError(
        'invalid-argument',
        'Uma ou mais opções não pertencem ao serviço selecionado.',
      );
    }
    return {
      attributeId: attribute.id,
      attributeLabel: attribute.label,
      optionId: option.id,
      optionLabel: option.label,
    };
  });
  return {
    selections: snapshot.map(({ attributeId, optionId }) => ({ attributeId, optionId })),
    snapshot,
  };
}

function isProductImage(value: unknown): value is ProductImage {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const image = value as Record<string, unknown>;
  return (
    typeof image.id === 'string' &&
    typeof image.storagePath === 'string' &&
    typeof image.downloadUrl === 'string' &&
    (image.downloadUrl.startsWith('https://') || image.downloadUrl.startsWith('http://'))
  );
}

async function resolveEffectiveGallery(
  business: { tenantId: string },
  product: Awaited<ReturnType<typeof findBookableProduct>>,
  selections: ProductCustomizationSelection[],
): Promise<ProductImage[]> {
  const defaults = defaultProductImages(product);
  if (defaults.length < 1 || defaults.length > 10 || !defaults.every(isProductImage)) {
    throw new HttpsError('internal', 'A galeria padrão do serviço está inválida.');
  }
  if (selections.length === 0) return defaults;

  const combinationKey = productGalleryCombinationKey(selections);
  const galleryId = productGalleryDocumentId(product.id, combinationKey);
  const gallerySnapshot = await firestore
    .collection(collections.productImageGalleries)
    .doc(galleryId)
    .get();
  const gallery = gallerySnapshot.data() as ProductGalleryDocument | undefined;
  if (
    !gallerySnapshot.exists ||
    !gallery ||
    gallery.tenantId !== business.tenantId ||
    gallery.productId !== product.id ||
    gallery.combinationKey !== combinationKey ||
    gallery.published !== true
  ) {
    return defaults;
  }
  if (
    !Array.isArray(gallery.images) ||
    gallery.images.length < 1 ||
    gallery.images.length > 10 ||
    !gallery.images.every(isProductImage)
  ) {
    throw new HttpsError('internal', 'A galeria de imagens do serviço está inválida.');
  }
  return gallery.images;
}

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
  const correlationId = randomUUID();
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
    const customization = validateCustomizationSelections(
      product.customizationAttributes,
      input.customizationSelections,
    );
    const priceCents = resolveProductPriceCents(
      product.priceCents,
      product.variantPrices,
      customization.selections,
    );
    if (priceCents === undefined) {
      throw new HttpsError(
        'failed-precondition',
        'O preço desta combinação de opções não está disponível.',
      );
    }
    const effectiveImages = await resolveEffectiveGallery(
      business,
      product,
      customization.selections,
    );
    const selectedImage = input.selectedImageId
      ? effectiveImages.find((image) => image.id === input.selectedImageId)
      : effectiveImages[0];
    if (!selectedImage) {
      throw new HttpsError(
        'invalid-argument',
        'A imagem selecionada não pertence à galeria deste serviço.',
      );
    }
    logger.info('booking.performance', {
      operation: 'appointment_registration',
      stage: 'shared_data_resolution',
      durationMs: Math.round(performance.now() - resolutionStartedAt),
      coldStart: requestColdStart,
      correlationId,
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
      correlationId,
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
        priceCents,
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
        productImageUrlSnapshot: selectedImage.downloadUrl,
        ...(customization.snapshot ? { customizationSnapshot: customization.snapshot } : {}),
        productPriceCentsSnapshot: priceCents,
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
        correlationId,
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
      correlationId,
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
      correlationId,
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
