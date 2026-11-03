import { createHash, randomUUID } from 'node:crypto';
import { Timestamp, Transaction } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { performance } from 'node:perf_hooks';
import type {
  CreatePublicAppointmentInput,
  CreatePublicAppointmentResult,
} from '../../../shared/domain/interfaces/appointment.interface';
import { normalizeBrazilianPhone } from '../../../shared/domain/phone';
import { fiveMinuteBucketStarts } from '../../../shared/domain/interval';
import { calculateCommissionCents } from '../../../shared/domain/money';
import {
  hasValidActivePromotion,
  resolveProductPricing,
} from '../../../shared/domain/product-price';
import {
  estimateDateFromInstant,
  getZonedDateTimeParts,
  isValidDateString,
  isValidIanaTimezone,
} from '../../../shared/domain/timezone';
import { DomainError } from '../../../shared/domain/errors';
import type {
  ProductCustomizationAttribute,
  ProductCustomizationSelection,
  ProductImage,
} from '../../../shared/domain/interfaces/product.interface';
import { collections } from '../config/collections';
import { firestore, professionalProductId } from './firestore.service';
import { findBookableProduct, findPublicBusiness } from './public-catalog.service';
import { isRequestedSlotAvailable, searchAvailability } from './availability.service';
import { isFirestoreIndexUnavailableError } from './firestore-error.service';
import {
  defaultProductImages,
  productGalleryCombinationKey,
  productGalleryDocumentId,
  type ProductGalleryDocument,
} from '../model/product-gallery.model';
import type { BookingSnapshot } from '../interfaces/booking.interface';

type BookingCustomizationData = {
  selections: ProductCustomizationSelection[];
  snapshot?: Array<BookingSnapshot>;
};

const validName = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length <= 100;

function isPaymentMethod(value: unknown): value is CreatePublicAppointmentInput['paymentMethod'] {
  return value === 'debit' || value === 'credit' || value === 'cash' || value === 'pix';
}

const parseCallableInput = (value: unknown): CreatePublicAppointmentInput => {
  if (typeof value !== 'object' || value === null) {
    throw new HttpsError('invalid-argument', 'Os dados do agendamento estão incompletos.');
  }

  const input = value as Record<string, unknown>;

  if (
    typeof input.businessSlug !== 'string' ||
    typeof input.productId !== 'string' ||
    (input.professionalId !== undefined &&
      (typeof input.professionalId !== 'string' || input.professionalId.trim().length === 0)) ||
    (input.startsAt !== undefined && typeof input.startsAt !== 'string') ||
    typeof input.customerPhone !== 'string' ||
    !isPaymentMethod(input.paymentMethod) ||
    !validName(input.customerName) ||
    input.customerName.trim().length === 0 ||
    (input.whatsappOptIn !== undefined && typeof input.whatsappOptIn !== 'boolean')
  ) {
    throw new HttpsError('invalid-argument', 'Revise os dados do agendamento e tente novamente.');
  }

  if (
    (input.paymentMethod === 'credit' &&
      (typeof input.installments !== 'number' ||
        !Number.isSafeInteger(input.installments) ||
        Number(input.installments) < 1 ||
        Number(input.installments) > 5)) ||
    (input.paymentMethod !== 'credit' && input.installments !== undefined)
  ) {
    throw new HttpsError(
      'invalid-argument',
      'Informe de 1 a 5 parcelas somente para pagamento no crédito.',
    );
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
    ...(input.professionalId !== undefined ? { professionalId: input.professionalId } : {}),
    ...(input.startsAt !== undefined ? { startsAt: input.startsAt } : {}),
    customerPhone: input.customerPhone,
    customerName: input.customerName.trim(),
    whatsappOptIn: input.whatsappOptIn === true,
    paymentMethod: input.paymentMethod,
    ...(input.installments !== undefined ? { installments: Number(input.installments) } : {}),
    ...(customizationSelections !== undefined ? { customizationSelections } : {}),
    ...(input.selectedImageId !== undefined ? { selectedImageId: input.selectedImageId } : {}),
  };
};

function configuredEstimatedDeliveryDays(
  product: Awaited<ReturnType<typeof findBookableProduct>>,
  selections: ProductCustomizationSelection[],
): number | undefined {
  if (product.estimatedDeliveryEnabled !== true) return undefined;

  const variants = product.variantPrices;
  const variant = variants?.length
    ? variants.find(
        (candidate) =>
          candidate.selections.length === selections.length &&
          candidate.selections.every((selection) =>
            selections.some(
              (selected) =>
                selected.attributeId === selection.attributeId &&
                selected.optionId === selection.optionId,
            ),
          ),
      )
    : undefined;
  const days = variants?.length ? variant?.estimatedDeliveryDays : product.estimatedDeliveryDays;

  return Number.isSafeInteger(days) && Number(days) > 0 ? Number(days) : undefined;
}

function parseStartsAt(value: string | undefined): Date {
  if (!value) {
    throw new HttpsError('invalid-argument', 'Escolha um horário válido para o agendamento.');
  }

  const startsAt = new Date(value);

  if (!Number.isFinite(startsAt.getTime()) || startsAt.toISOString() !== value) {
    throw new HttpsError('invalid-argument', 'Escolha um horário válido para o agendamento.');
  }

  return startsAt;
}

function validateCustomizationSelections(
  attributes: ProductCustomizationAttribute[] | undefined,
  selections: ProductCustomizationSelection[] | undefined,
): BookingCustomizationData {
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
): Promise<CreatePublicAppointmentResult> {
  const input = parseCallableInput(value);
  const phoneE164 = normalizeBrazilianPhone(input.customerPhone);

  if (!phoneE164) {
    throw new HttpsError('invalid-argument', 'Informe um telefone brasileiro válido com DDD.');
  }

  const requestStartedAt = performance.now();
  const correlationId = randomUUID();

  try {
    const resolutionStartedAt = performance.now();

    const business = await findPublicBusiness(input.businessSlug);

    const [tenantSnapshot, product, publicProductSnapshot] = await Promise.all([
      firestore.collection(collections.tenants).doc(business.tenantId).get(),
      findBookableProduct(business, input.productId),
      firestore.collection(collections.publicProducts).doc(input.productId).get(),
    ]);

    const tenant = tenantSnapshot.data();
    const publicProduct = publicProductSnapshot.data();

    if (
      !tenantSnapshot.exists ||
      tenant?.active !== true ||
      !publicProductSnapshot.exists ||
      publicProduct?.tenantId !== business.tenantId ||
      publicProduct.businessSlug !== business.slug ||
      publicProduct.active !== true ||
      publicProduct.published !== true
    ) {
      throw new HttpsError('failed-precondition', 'Empresa, serviço ou profissional indisponível.');
    }

    const customization = validateCustomizationSelections(
      product.customizationAttributes,
      input.customizationSelections,
    );

    const pricing = resolveProductPricing(product, customization.selections);

    if (
      !pricing ||
      !Number.isSafeInteger(pricing.originalPriceCents) ||
      pricing.originalPriceCents < 0 ||
      !Number.isSafeInteger(pricing.effectivePriceCents) ||
      pricing.effectivePriceCents < 0 ||
      (product.promotionActive === true &&
        (!pricing.promotionApplied || !hasValidActivePromotion(product)))
    ) {
      throw new HttpsError(
        'failed-precondition',
        'O preço desta combinação de opções não está mais disponível.',
      );
    }
    const priceCents = pricing.effectivePriceCents;
    const estimatedDays = configuredEstimatedDeliveryDays(product, customization.selections);
    const hasEstimatedDelivery = product.estimatedDeliveryEnabled === true;

    if (hasEstimatedDelivery && estimatedDays === undefined) {
      throw new HttpsError(
        'failed-precondition',
        'O prazo estimado desta combinação não está mais disponível.',
      );
    }

    if (hasEstimatedDelivery && input.startsAt !== undefined) {
      throw new HttpsError(
        'invalid-argument',
        'Não envie data ou horário para serviços com prazo estimado.',
      );
    }

    if (!hasEstimatedDelivery && (!input.professionalId || !input.startsAt)) {
      throw new HttpsError(
        'invalid-argument',
        'Escolha um profissional, uma data e um horário para este serviço.',
      );
    }

    const timezone = typeof tenant.timezone === 'string' ? tenant.timezone : '';
    if (!isValidIanaTimezone(timezone)) {
      throw new HttpsError('failed-precondition', 'O fuso horário da empresa está inválido.');
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
      correlationId,
    });

    const bookingIntervalMinutes = Number(tenant.bookingIntervalMinutes);

    if (
      !Number.isInteger(bookingIntervalMinutes) ||
      bookingIntervalMinutes < 5 ||
      bookingIntervalMinutes % 5 !== 0
    ) {
      throw new HttpsError('internal', 'O intervalo de agendamento da empresa é inválido.');
    }

    let professionalId = input.professionalId;
    let startsAt: Date;

    if (hasEstimatedDelivery) {
      const availability = await searchAvailability({
        businessSlug: business.slug,
        productId: product.id,
        date: toBusinessLocalDate(new Date(), timezone),
        ...(professionalId ? { professionalId } : {}),
        ...(!professionalId ? { includeEligibleProfessionals: true } : {}),
      });

      if (!professionalId) {
        const eligible = availability.eligibleProfessionals ?? [];

        if (eligible.length !== 1) {
          throw new HttpsError(
            'failed-precondition',
            eligible.length === 0
              ? 'Não há profissional com horário reservável nos próximos 31 dias.'
              : 'Selecione um profissional para continuar.',
          );
        }

        professionalId = eligible[0]!.id;
      }

      const nearestSlot = availability.slots.find((slot) => slot.professionalId === professionalId);

      if (!availability.date || !nearestSlot) {
        throw new HttpsError(
          'failed-precondition',
          'Não há horário reservável para este profissional nos próximos 31 dias.',
        );
      }

      startsAt = new Date(nearestSlot.startsAt);
    } else {
      startsAt = parseStartsAt(input.startsAt);
    }

    if (!professionalId) {
      throw new HttpsError('invalid-argument', 'Selecione um profissional para continuar.');
    }

    const [professionalSnapshot, association] = await Promise.all([
      firestore.collection(collections.professionals).doc(professionalId).get(),
      firestore
        .collection(collections.professionalProducts)
        .doc(professionalProductId(business.tenantId, professionalId, product.id))
        .get(),
    ]);
    const professional = professionalSnapshot.data();

    if (
      !professionalSnapshot.exists ||
      professional?.tenantId !== business.tenantId ||
      professional.active !== true ||
      !association.exists ||
      association.data()?.tenantId !== business.tenantId ||
      association.data()?.active !== true
    ) {
      throw new HttpsError(
        'failed-precondition',
        'Este profissional não atende o serviço selecionado.',
      );
    }

    const local = getZonedDateTimeParts(startsAt, timezone);
    const localDate = `${local.year}-${String(local.month).padStart(2, '0')}-${String(local.day).padStart(2, '0')}`;

    if (!isValidDateString(localDate)) {
      throw new HttpsError('invalid-argument', 'A data escolhida não é válida.');
    }

    const slotAvailable = await isRequestedSlotAvailable({
      tenantId: business.tenantId,
      professionalId,
      startsAt,
      durationMinutes: product.durationMinutes,
      timezone,
      bookingIntervalMinutes,
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
        .doc(reservationDocumentId(business.tenantId, professionalId, bucket)),
    );

    const appointmentId = reservationDocumentId(
      business.tenantId,
      professionalId,
      buckets[0] ?? 0,
    );

    const appointmentRef = firestore.collection(collections.appointments).doc(appointmentId);
    const notificationJobRef = firestore
      .collection(collections.appointmentNotificationJobs)
      .doc(appointmentId);

    const transactionStartedAt = performance.now();

    const result = await firestore.runTransaction(
      async (transaction: Transaction): Promise<CreatePublicAppointmentResult> => {
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
      const estimatedDate =
        estimatedDays !== undefined
          ? estimateDateFromInstant(createdAt.toDate(), estimatedDays, timezone)
          : undefined;

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
        professionalId,
        professionalNameSnapshot: professional.name,
        startsAt: Timestamp.fromDate(startsAt),
        endsAt: Timestamp.fromDate(endsAt),
        durationMinutes: product.durationMinutes,
        status: 'pending',
        productNameSnapshot: product.name,
        productImageUrlSnapshot: selectedImage.downloadUrl,
        ...(customization.snapshot ? { customizationSnapshot: customization.snapshot } : {}),
        productPriceCentsSnapshot: priceCents,
        productOriginalPriceCentsSnapshot: pricing.originalPriceCents,
        ...(pricing.promotionApplied
          ? {
              promotionSnapshot: {
                promotionApplied: true as const,
                promotionalPriceCents: pricing.effectivePriceCents,
              },
            }
          : {}),
        ...(estimatedDays !== undefined && estimatedDate
          ? {
              estimatedDeliveryDaysSnapshot: estimatedDays,
              estimatedDeliveryDateSnapshot: estimatedDate,
              estimatedDeliveryTimezoneSnapshot: timezone,
            }
          : {}),
        paymentMethodSnapshot: input.paymentMethod,
        ...(input.installments !== undefined ? { installmentsSnapshot: input.installments } : {}),
        commissionTypeSnapshot: product.commissionType,
        commissionValueSnapshot: product.commissionValue,
        commissionAmountCentsSnapshot: commissionAmountCents,
        whatsappOptIn: input.whatsappOptIn === true,
        createdAt,
        updatedAt: createdAt,
        createdBy: 'public-customer',
      });

      for (const [index, bucket] of buckets.entries()) {
        if (reservationRefs[index]) {
          transaction.create(reservationRefs[index], {
            tenantId: business.tenantId,
            professionalId,
            appointmentId,
            bucketStartAt: Timestamp.fromMillis(bucket),
            createdAt,
          });
        }
      }

      transaction.create(notificationJobRef, {
        appointmentId,
        tenantId: business.tenantId,
        correlationId,
        status: 'pending',
        createdAt,
        updatedAt: createdAt,
      });
      return {
        appointmentId,
        status: 'pending',
        professionalId,
        professionalName: professional.name,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        effectivePriceCents: pricing.effectivePriceCents,
        originalPriceCents: pricing.originalPriceCents,
        promotionApplied: pricing.promotionApplied,
        ...(estimatedDays !== undefined && estimatedDate
          ? {
              estimatedDelivery: {
                days: estimatedDays,
                estimatedDate,
                timezone,
              },
            }
          : {}),
      };
      },
    );

    logger.info('booking.performance', {
      operation: 'appointment_registration',
      stage: 'transaction',
      durationMs: Math.round(performance.now() - transactionStartedAt),
      correlationId,
    });

    return result;
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
