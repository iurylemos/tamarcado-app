import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPublicAppointment, reservationDocumentId } from '../../services/booking.service';
import { listAvailableSlots, searchAvailability } from '../../services/availability.service';
import {
  findBookableProduct,
  findPublicBusiness,
  listPublicProductRecords,
} from '../../services/public-catalog.service';
import { createSeedDocuments } from '../../../test/fixtures/seed-data';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getZonedDateTimeParts, localDateTimeToUtc } from '../../../../shared/domain/timezone';
import { logger } from 'firebase-functions';
import { processAppointmentNotification } from '../../services/appointment-notification.service';
import {
  WhatsAppProviderError,
  type WhatsAppProvider,
} from '../../services/whatsapp-provider.interface';
import {
  createProductCustomizationTestDocuments,
  customizationTestProductId,
  customizationTestSelections,
} from '../../../test/fixtures/product-customization-data';

const emulatorOnly = describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST);
let db: Firestore;

afterEach(() => vi.restoreAllMocks());

function nextOpenDate(): string {
  const now = getZonedDateTimeParts(new Date(), 'America/Sao_Paulo');
  const candidate = new Date(Date.UTC(now.year, now.month - 1, now.day + 1));
  if (candidate.getUTCDay() === 0) candidate.setUTCDate(candidate.getUTCDate() + 1);
  return `${candidate.getUTCFullYear()}-${String(candidate.getUTCMonth() + 1).padStart(2, '0')}-${String(candidate.getUTCDate()).padStart(2, '0')}`;
}

async function resetFirestore() {
  for (const collection of await db.listCollections()) {
    const documents = await collection.get();
    const batch = db.batch();
    documents.docs.forEach((document) => batch.delete(document.ref));
    await batch.commit();
  }
  const batch = db.batch();
  [...createSeedDocuments(), ...createProductCustomizationTestDocuments()].forEach((document) => {
    batch.set(db.collection(document.collection).doc(document.id), document.data);
  });
  await batch.commit();
}

emulatorOnly('public booking on the Firestore emulator', () => {
  beforeAll(() => {
    const app =
      getApps()[0] ?? initializeApp({ projectId: process.env.GCLOUD_PROJECT ?? 'demo-tamarcado' });
    db = getFirestore(app);
  });

  beforeEach(async () => resetFirestore());

  it('scopes the published catalog, filters inactive products, and rejects a foreign service', async () => {
    const business = await findPublicBusiness('studio-aurora');
    const products = await listPublicProductRecords(business);
    expect(products.map((product) => product.id)).toContain('service-corte');
    expect(products.map((product) => product.id)).not.toContain('service-hidratacao');
    await expect(findBookableProduct(business, 'service-consulta')).rejects.toThrow(
      'Serviço não encontrado para esta empresa.',
    );
  });

  it('validates current selections and snapshots server-derived labels and the selected gallery URL', async () => {
    const slots = await listAvailableSlots({
      businessSlug: 'studio-aurora',
      productId: customizationTestProductId,
      professionalId: 'professional-ana',
      date: nextOpenDate(),
    });
    const slot = slots[0];
    expect(slot).toBeDefined();
    const result = await createPublicAppointment({
      businessSlug: 'studio-aurora',
      productId: customizationTestProductId,
      professionalId: 'professional-ana',
      startsAt: slot!.startsAt,
      customerName: 'Maria Silva',
      customerPhone: '(11) 99999-0009',
      customizationSelections: customizationTestSelections.map((selection) => ({
        ...selection,
        attributeLabel: 'client label is ignored',
        optionLabel: 'client option is ignored',
      })) as typeof customizationTestSelections,
      selectedImageId: 'variant-image-2',
      productImageUrlSnapshot: 'https://untrusted.example/client-url',
    });
    const appointment = (
      await db.collection('appointments').doc(result.appointmentId).get()
    ).data();
    expect(appointment).toMatchObject({
      productImageUrlSnapshot: 'https://images.example.test/variant-2.jpg',
      customizationSnapshot: [
        {
          attributeId: 'color',
          attributeLabel: 'Cor',
          optionId: 'color-brown',
          optionLabel: 'Castanho',
        },
        {
          attributeId: 'size',
          attributeLabel: 'Tamanho',
          optionId: 'size-couple',
          optionLabel: 'Casal',
        },
      ],
    });
    expect(appointment?.productImageUrlSnapshot).not.toBe('https://untrusted.example/client-url');
  });

  it('uses the selected variant price for the appointment snapshot and commission', async () => {
    const slots = await listAvailableSlots({
      businessSlug: 'vitoria-moura-beauty',
      productId: 'service-vitoria-lashes',
      professionalId: 'professional-vitoria-moura',
      date: nextOpenDate(),
    });
    const slot = slots[0];
    expect(slot).toBeDefined();

    const result = await createPublicAppointment({
      businessSlug: 'vitoria-moura-beauty',
      productId: 'service-vitoria-lashes',
      professionalId: 'professional-vitoria-moura',
      startsAt: slot!.startsAt,
      customerName: 'Maria Silva',
      customerPhone: '(11) 99999-0009',
      customizationSelections: [
        { attributeId: 'lash-service', optionId: 'volume-brasileiro' },
      ],
    });
    const appointment = (
      await db.collection('appointments').doc(result.appointmentId).get()
    ).data();

    expect(appointment).toMatchObject({
      productPriceCentsSnapshot: 12000,
      commissionAmountCentsSnapshot: 4200,
      customizationSnapshot: [
        {
          attributeId: 'lash-service',
          optionId: 'volume-brasileiro',
          optionLabel: 'Volume Brasileiro',
        },
      ],
    });
  });

  it.each([
    ['missing', []],
    [
      'duplicate attribute',
      [
        { attributeId: 'color', optionId: 'color-brown' },
        { attributeId: 'color', optionId: 'color-standard' },
      ],
    ],
    [
      'unknown option',
      [
        { attributeId: 'color', optionId: 'size-king' },
        { attributeId: 'size', optionId: 'size-couple' },
      ],
    ],
    [
      'extra attribute',
      [
        { attributeId: 'color', optionId: 'color-brown' },
        { attributeId: 'size', optionId: 'size-couple' },
        { attributeId: 'unknown', optionId: 'unknown-option' },
      ],
    ],
  ])('rejects %s customization selections', async (_label, customizationSelections) => {
    const slot = (
      await listAvailableSlots({
        businessSlug: 'studio-aurora',
        productId: customizationTestProductId,
        professionalId: 'professional-ana',
        date: nextOpenDate(),
      })
    )[0];
    await expect(
      createPublicAppointment({
        businessSlug: 'studio-aurora',
        productId: customizationTestProductId,
        professionalId: 'professional-ana',
        startsAt: slot!.startsAt,
        customerName: 'Maria Silva',
        customerPhone: '(11) 99999-0009',
        customizationSelections,
      }),
    ).rejects.toMatchObject({ code: 'invalid-argument' });
    expect(
      (await db.collection('appointments').where('productId', '==', customizationTestProductId).get())
        .docs,
    ).toHaveLength(0);
  });

  it('rejects an image ID outside the exact or fallback effective gallery', async () => {
    const slot = (
      await listAvailableSlots({
        businessSlug: 'studio-aurora',
        productId: customizationTestProductId,
        professionalId: 'professional-ana',
        date: nextOpenDate(),
      })
    )[0];
    await expect(
      createPublicAppointment({
        businessSlug: 'studio-aurora',
        productId: customizationTestProductId,
        professionalId: 'professional-ana',
        startsAt: slot!.startsAt,
        customerName: 'Maria Silva',
        customerPhone: '(11) 99999-0009',
        customizationSelections: customizationTestSelections,
        selectedImageId: 'not-in-gallery',
      }),
    ).rejects.toMatchObject({ code: 'invalid-argument' });
    expect(
      (await db.collection('appointments').where('productId', '==', customizationTestProductId).get())
        .docs,
    ).toHaveLength(0);
  });

  it('excludes blocked and occupied periods and returns only active eligible professionals', async () => {
    const slots = await listAvailableSlots({
      businessSlug: 'studio-aurora',
      productId: 'service-corte',
      date: nextOpenDate(),
    });
    expect(slots.length).toBeGreaterThan(0);
    expect(new Set(slots.map((slot) => slot.professionalId))).toEqual(
      new Set(['professional-ana', 'professional-bruna']),
    );
    const singleProfessional = await listAvailableSlots({
      businessSlug: 'studio-aurora',
      productId: 'service-coloracao',
      date: nextOpenDate(),
    });
    expect(new Set(singleProfessional.map((slot) => slot.professionalId))).toEqual(
      new Set(['professional-ana']),
    );

    const blockSnapshot = await db.collection('blocked_periods').doc('block-aurora-ana').get();
    const blockStartsAt = blockSnapshot.data()?.startsAt.toDate() as Date;
    const localBlockDate = getZonedDateTimeParts(blockStartsAt, 'America/Sao_Paulo');
    const blockDate = `${localBlockDate.year}-${String(localBlockDate.month).padStart(2, '0')}-${String(localBlockDate.day).padStart(2, '0')}`;
    const slotsOnBlockDate = await listAvailableSlots({
      businessSlug: 'studio-aurora',
      productId: 'service-corte',
      date: blockDate,
    });
    expect(
      slotsOnBlockDate.some(
        (slot) =>
          slot.professionalId === 'professional-ana' &&
          slot.startsAt === blockStartsAt.toISOString(),
      ),
    ).toBe(false);
    expect(
      slotsOnBlockDate.some(
        (slot) =>
          slot.professionalId === 'professional-bruna' &&
          slot.startsAt === blockStartsAt.toISOString(),
      ),
    ).toBe(true);
  });

  it('uses professional document IDs when records do not store an id field', async () => {
    await db
      .collection('professionals')
      .doc('professional-ana')
      .update({ id: FieldValue.delete() });

    const input = {
      businessSlug: 'studio-aurora',
      productId: 'service-corte',
      date: nextOpenDate(),
    };
    const [listedSlots, search] = await Promise.all([
      listAvailableSlots(input),
      searchAvailability(input),
    ]);

    expect(listedSlots.some((slot) => slot.professionalId === 'professional-ana')).toBe(true);
    expect(search.slots.some((slot) => slot.professionalId === 'professional-ana')).toBe(true);
  });

  it('returns the earliest available date within the bounded 31-date window', async () => {
    const finalDate = nextOpenDate();
    const date = new Date(`${finalDate}T12:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() - 30);
    const startDate = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;

    await db
      .collection('blocked_periods')
      .doc('window-block')
      .set({
        tenantId: 'tenant-aurora',
        startsAt: Timestamp.fromDate(localDateTimeToUtc(startDate, '00:00', 'America/Sao_Paulo')),
        endsAt: Timestamp.fromDate(localDateTimeToUtc(finalDate, '00:00', 'America/Sao_Paulo')),
      });

    const result = await searchAvailability({
      businessSlug: 'studio-aurora',
      productId: 'service-corte',
      date: startDate,
    });

    expect(result.date).toBe(finalDate);
    expect(result.slots.length).toBeGreaterThan(0);
    expect(result.slots.every((slot) => slot.startsAt.startsWith(finalDate))).toBe(true);
  });

  it('excludes slots overlapped by an appointment that starts before the slot', async () => {
    const date = nextOpenDate();
    const slot = (
      await listAvailableSlots({
        businessSlug: 'studio-aurora',
        productId: 'service-corte',
        professionalId: 'professional-ana',
        date,
      })
    )[0];
    expect(slot).toBeDefined();
    const slotStart = new Date(slot!.startsAt);
    await db
      .collection('appointments')
      .doc('overlapping-appointment')
      .set({
        tenantId: 'tenant-aurora',
        professionalId: 'professional-ana',
        status: 'confirmed',
        startsAt: Timestamp.fromMillis(slotStart.getTime() - 15 * 60_000),
        endsAt: Timestamp.fromMillis(slotStart.getTime() + 15 * 60_000),
      });

    const result = await searchAvailability({
      businessSlug: 'studio-aurora',
      productId: 'service-corte',
      date,
    });

    expect(
      result.slots.some(
        (candidate) =>
          candidate.professionalId === 'professional-ana' && candidate.startsAt === slot!.startsAt,
      ),
    ).toBe(false);
  });

  it('returns an empty result when the entire 31-date window is blocked', async () => {
    const startDate = nextOpenDate();
    const end = new Date(`${startDate}T12:00:00.000Z`);
    end.setUTCDate(end.getUTCDate() + 31);
    const endDate = `${end.getUTCFullYear()}-${String(end.getUTCMonth() + 1).padStart(2, '0')}-${String(end.getUTCDate()).padStart(2, '0')}`;
    await db
      .collection('blocked_periods')
      .doc('window-block')
      .set({
        tenantId: 'tenant-aurora',
        startsAt: Timestamp.fromDate(localDateTimeToUtc(startDate, '00:00', 'America/Sao_Paulo')),
        endsAt: Timestamp.fromDate(localDateTimeToUtc(endDate, '00:00', 'America/Sao_Paulo')),
      });
    await expect(
      searchAvailability({
        businessSlug: 'studio-aurora',
        productId: 'service-corte',
        date: startDate,
      }),
    ).resolves.toEqual({ date: null, slots: [] });
  });

  it('rejects a selected slot that becomes blocked before registration', async () => {
    const date = nextOpenDate();
    const slot = (
      await listAvailableSlots({
        businessSlug: 'studio-aurora',
        productId: 'service-corte',
        professionalId: 'professional-ana',
        date,
      })
    )[0];
    expect(slot).toBeDefined();
    await db
      .collection('blocked_periods')
      .doc('new-slot-block')
      .set({
        tenantId: 'tenant-aurora',
        professionalId: 'professional-ana',
        startsAt: Timestamp.fromDate(new Date(slot!.startsAt)),
        endsAt: Timestamp.fromDate(new Date(slot!.endsAt)),
      });

    await expect(
      createPublicAppointment({
        businessSlug: 'studio-aurora',
        productId: 'service-corte',
        professionalId: 'professional-ana',
        startsAt: slot!.startsAt,
        customerName: 'Maria Silva',
        customerPhone: '(11) 99999-0009',
        whatsappOptIn: false,
      }),
    ).rejects.toThrow('Este horário não está mais disponível.');
    expect((await db.collection('appointment_notification_jobs').get()).docs).toHaveLength(0);
  });

  it('records notification outcomes and skips completed jobs on redelivery', async () => {
    const date = nextOpenDate();
    const slot = (
      await listAvailableSlots({
        businessSlug: 'studio-aurora',
        productId: 'service-corte',
        professionalId: 'professional-ana',
        date,
      })
    )[0];
    const result = await createPublicAppointment({
      businessSlug: 'studio-aurora',
      productId: 'service-corte',
      professionalId: 'professional-ana',
      startsAt: slot!.startsAt,
      customerName: 'Maria Silva',
      customerPhone: '(11) 99999-0009',
      whatsappOptIn: false,
    });
    const sendTemplate = vi.fn().mockResolvedValue({ providerMessageId: 'message-1' });
    const provider: WhatsAppProvider = {
      name: 'test',
      sendTemplate,
      sendTemplateMessage: vi.fn().mockResolvedValue({ providerMessageId: 'message-1' }),
    };

    await processAppointmentNotification(result.appointmentId, provider);
    await processAppointmentNotification(result.appointmentId, provider);

    expect(sendTemplate).toHaveBeenCalledOnce();
    const completedJob = await db
      .collection('appointment_notification_jobs')
      .doc(result.appointmentId)
      .get();
    expect(completedJob.data()).toMatchObject({ status: 'completed' });
    const appointment = await db.collection('appointments').doc(result.appointmentId).get();
    expect(appointment.data()).toMatchObject({ status: 'pending' });
  });

  it('records a sanitized failed notification without changing the appointment', async () => {
    const date = nextOpenDate();
    const slot = (
      await listAvailableSlots({
        businessSlug: 'studio-aurora',
        productId: 'service-corte',
        professionalId: 'professional-ana',
        date,
      })
    )[0];
    const result = await createPublicAppointment({
      businessSlug: 'studio-aurora',
      productId: 'service-corte',
      professionalId: 'professional-ana',
      startsAt: slot!.startsAt,
      customerName: 'Maria Silva',
      customerPhone: '(11) 99999-0009',
      whatsappOptIn: false,
    });
    const provider: WhatsAppProvider = {
      name: 'test',
      sendTemplate: vi
        .fn()
        .mockRejectedValue(new WhatsAppProviderError('PROVIDER_ERROR', 'Provider delivery failed')),
      sendTemplateMessage: vi.fn().mockResolvedValue({ providerMessageId: 'message-1' }),
    };

    await processAppointmentNotification(result.appointmentId, provider);

    const job = (
      await db.collection('appointment_notification_jobs').doc(result.appointmentId).get()
    ).data();
    expect(job).toMatchObject({ status: 'failed', failureCode: 'provider_delivery_failed' });
    expect(JSON.stringify(job)).not.toContain('+5511999990001');
    expect(
      (await db.collection('appointments').doc(result.appointmentId).get()).data()?.status,
    ).toBe('pending');
  });

  it('leaves notification jobs pending when worker execution fails so the trigger can retry', async () => {
    const date = nextOpenDate();
    const slot = (
      await listAvailableSlots({
        businessSlug: 'studio-aurora',
        productId: 'service-corte',
        professionalId: 'professional-ana',
        date,
      })
    )[0];
    const result = await createPublicAppointment({
      businessSlug: 'studio-aurora',
      productId: 'service-corte',
      professionalId: 'professional-ana',
      startsAt: slot!.startsAt,
      customerName: 'Maria Silva',
      customerPhone: '(11) 99999-0009',
      whatsappOptIn: false,
    });
    const provider: WhatsAppProvider = {
      name: 'test',
      sendTemplate: vi.fn().mockRejectedValue(new Error('temporary worker failure')),
      sendTemplateMessage: vi.fn().mockResolvedValue({ providerMessageId: 'message-1' }),
    };

    await expect(processAppointmentNotification(result.appointmentId, provider)).rejects.toThrow(
      'temporary worker failure',
    );
    const job = await db
      .collection('appointment_notification_jobs')
      .doc(result.appointmentId)
      .get();
    expect(job.data()).toMatchObject({ status: 'pending' });
  });

  it('logs distinct request stages without customer personal data', async () => {
    const info = vi.spyOn(logger, 'info').mockImplementation(() => undefined);
    const date = nextOpenDate();
    const search = await searchAvailability({
      businessSlug: 'studio-aurora',
      productId: 'service-corte',
      date,
    });
    const slot = search.slots.find((candidate) => candidate.professionalId === 'professional-ana');
    expect(slot).toBeDefined();

    const booking = await createPublicAppointment({
      businessSlug: 'studio-aurora',
      productId: 'service-corte',
      professionalId: 'professional-ana',
      startsAt: slot!.startsAt,
      customerName: 'Private Customer Name',
      customerPhone: '(11) 99999-0009',
      whatsappOptIn: false,
    });
    await processAppointmentNotification(booking.appointmentId, {
      name: 'test',
      sendTemplate: vi.fn().mockResolvedValue({ providerMessageId: 'message-2' }),
      sendTemplateMessage: vi.fn().mockResolvedValue({ providerMessageId: 'message-2' }),
    });

    const entries = info.mock.calls
      .filter(([message]) => message === 'booking.performance')
      .map(([, fields]) => fields);
    const stages = entries.map((fields) => (fields as { stage: string }).stage);
    expect(stages).toEqual(
      expect.arrayContaining([
        'shared_data_resolution',
        'conflict_reads',
        'slot_evaluation',
        'transaction',
        'total',
        'worker_total',
      ]),
    );
    expect(
      entries.every(
        (fields) => typeof (fields as { durationMs?: unknown }).durationMs === 'number',
      ),
    ).toBe(true);
    expect(JSON.stringify(entries)).not.toMatch(/Private Customer Name|11999990009|message body/i);
    info.mockRestore();
  });

  it('rejects invalid availability search dates', async () => {
    await expect(
      searchAvailability({
        businessSlug: 'studio-aurora',
        productId: 'service-corte',
        date: '0000-02-30',
      }),
    ).rejects.toThrow('Informe empresa, serviço e uma data válida.');
  });

  it('atomically accepts only one of two concurrent overlapping requests and snapshots the terms', async () => {
    const date = nextOpenDate();
    const slot = (
      await listAvailableSlots({
        businessSlug: 'studio-aurora',
        productId: 'service-corte',
        professionalId: 'professional-ana',
        date,
      })
    )[0];
    expect(slot).toBeDefined();
    const request = {
      businessSlug: 'studio-aurora',
      productId: 'service-corte',
      professionalId: 'professional-ana',
      startsAt: slot!.startsAt,
      customerName: 'Maria Silva',
      customerPhone: '(11) 99999-0009',
      whatsappOptIn: false,
    };
    const outcomes = await Promise.allSettled([
      createPublicAppointment(request),
      createPublicAppointment(request),
    ]);
    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    const rejected = outcomes.find((outcome) => outcome.status === 'rejected');
    expect(rejected?.status === 'rejected' && rejected.reason.message).toContain('reservado');

    const accepted = outcomes.find((outcome) => outcome.status === 'fulfilled');
    if (accepted?.status !== 'fulfilled') throw new Error('No appointment was accepted.');
    const appointment = await db.collection('appointments').doc(accepted.value.appointmentId).get();
    expect(appointment.data()).toMatchObject({
      status: 'pending',
      tenantId: 'tenant-aurora',
      customerPhoneE164: '+5511999990009',
      productPriceCentsSnapshot: 12000,
      commissionAmountCentsSnapshot: 4200,
      whatsappOptIn: false,
    });
    expect(
      reservationDocumentId('tenant-aurora', 'professional-ana', Date.parse(slot!.startsAt)),
    ).toMatch(/^[a-f0-9]{64}$/);
    const jobs = await db.collection('appointment_notification_jobs').get();
    expect(jobs.docs).toHaveLength(1);
    expect(jobs.docs[0]?.data()).toMatchObject({
      appointmentId: accepted.value.appointmentId,
      tenantId: 'tenant-aurora',
      status: 'pending',
    });
    expect(jobs.docs[0]?.data()).not.toHaveProperty('customerPhoneE164');
  });
});

describe('reservationDocumentId', () => {
  it('is deterministic for a tenant, professional and five-minute bucket', () => {
    expect(reservationDocumentId('tenant', 'professional', 0)).toBe(
      reservationDocumentId('tenant', 'professional', 0),
    );
    expect(reservationDocumentId('tenant', 'professional', 0)).not.toBe(
      reservationDocumentId('other-tenant', 'professional', 0),
    );
  });
});

describe('public appointment customer name validation', () => {
  it('rejects a missing or blank customer name', async () => {
    const request = {
      businessSlug: 'studio-aurora',
      productId: 'service-corte',
      professionalId: 'professional-ana',
      startsAt: '2030-02-04T12:00:00.000Z',
      customerPhone: '(11) 99999-0009',
      whatsappOptIn: true,
    };

    await expect(createPublicAppointment(request)).rejects.toThrow(
      'Revise os dados do agendamento e tente novamente.',
    );
    await expect(createPublicAppointment({ ...request, customerName: '   ' })).rejects.toThrow(
      'Revise os dados do agendamento e tente novamente.',
    );
  });
});
