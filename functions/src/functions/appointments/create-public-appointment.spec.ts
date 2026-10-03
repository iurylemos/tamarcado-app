import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createPublicAppointment, reservationDocumentId } from '../../services/booking.service';
import { listAvailableSlots } from '../../services/availability.service';
import {
  findBookableProduct,
  findPublicBusiness,
  listPublicProductRecords,
} from '../../services/public-catalog.service';
import { createSeedDocuments } from '../../../test/fixtures/seed-data';
import { getZonedDateTimeParts } from '../../../../shared/domain/timezone';

const emulatorOnly = describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST);
let db: Firestore;

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
  createSeedDocuments().forEach((document) => {
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
