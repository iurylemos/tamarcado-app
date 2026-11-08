import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { collections } from '../../config/collections';
import { firestore } from '../../services/firestore.service';
import {
  deleteBlockedPeriod,
  getBackofficeWorkspace,
  saveBlockedPeriod,
  saveProduct,
  saveProfessional,
  saveTenantSettings,
  saveWorkingHours,
} from '../../services/backoffice.service';
import { listAvailableSlots } from '../../services/availability.service';
import {
  listPublicProductRecords,
  findPublicBusiness,
} from '../../services/public-catalog.service';
import { createSeedDocuments } from '../../../test/fixtures/seed-data';
import { getZonedDateTimeParts, isoWeekday } from '../../../../shared/domain/timezone';

const emulatorOnly = describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST);
const seededCollections = new Set<string>([
  collections.tenants,
  collections.publicBusinesses,
  collections.products,
  collections.publicProducts,
  collections.professionals,
  collections.professionalProducts,
  collections.workingHours,
  collections.appointments,
]);

async function prepareTenantFixtures() {
  const testIds = [
    [collections.products, 'us3-test-product'],
    [collections.publicProducts, 'us3-test-product'],
    [collections.professionals, 'us3-test-professional'],
    [collections.professionalProducts, 'tenant-aurora__us3-test-professional__service-corte'],
    [collections.workingHours, 'us3-test-hours'],
    [collections.blockedPeriods, 'us3-test-block'],
  ] as const;
  const batch = firestore.batch();
  for (const [collection, id] of testIds) {
    batch.delete(firestore.collection(collection).doc(id));
  }
  for (const tenantId of ['us1-test-tenant-a', 'us1-test-tenant-b']) {
    batch.set(firestore.collection(collections.tenants).doc(tenantId), {
      name: tenantId === 'us1-test-tenant-a' ? 'Empresa A' : 'Empresa B',
      slug: tenantId === 'us1-test-tenant-a' ? 'us1-empresa-a' : 'us1-empresa-b',
      segment: 'beauty',
      timezone: 'America/Sao_Paulo',
      bookingIntervalMinutes: 15,
      active: true,
      primaryColor: tenantId === 'us1-test-tenant-a' ? '#112233' : '#445566',
      secondaryColor: tenantId === 'us1-test-tenant-a' ? '#223344' : '#556677',
    });
    batch.set(firestore.collection(collections.publicBusinesses).doc(tenantId), {
      tenantId,
      name: tenantId === 'us1-test-tenant-a' ? 'Empresa A' : 'Empresa B',
      slug: tenantId === 'us1-test-tenant-a' ? 'us1-empresa-a' : 'us1-empresa-b',
      segment: 'beauty',
      published: true,
      primaryColor: tenantId === 'us1-test-tenant-a' ? '#112233' : '#445566',
      secondaryColor: tenantId === 'us1-test-tenant-a' ? '#223344' : '#556677',
    });
  }
  batch.set(firestore.collection(collections.products).doc('us3-test-product'), {
    tenantId: 'tenant-aurora',
    name: 'Produto inicial de teste',
    imageUrl: 'https://images.example.test/us3.jpg',
    priceCents: 5000,
    durationMinutes: 30,
    commissionType: 'fixed',
    commissionValue: 500,
    active: true,
  });
  batch.set(firestore.collection(collections.professionals).doc('us3-test-professional'), {
    tenantId: 'tenant-aurora',
    name: 'Pessoa de teste',
    phoneE164: '+5511999990020',
    active: true,
  });
  batch.set(firestore.collection(collections.workingHours).doc('us3-test-hours'), {
    tenantId: 'tenant-aurora',
    professionalId: 'professional-ana',
    dayOfWeek: 7,
    startLocalTime: '08:00',
    endLocalTime: '08:30',
    active: false,
  });
  createSeedDocuments().forEach((document) => {
    if (seededCollections.has(document.collection)) {
      batch.set(firestore.collection(document.collection).doc(document.id), document.data, {
        merge: true,
      });
    }
  });
  await batch.commit();
}

async function cleanTestDocuments() {
  const batch = firestore.batch();
  const testIds: Array<readonly [string, string]> = [
    [collections.products, 'us3-test-product'],
    [collections.publicProducts, 'us3-test-product'],
    [collections.professionals, 'us3-test-professional'],
    [collections.professionalProducts, 'tenant-aurora__us3-test-professional__service-corte'],
    [collections.workingHours, 'us3-test-hours'],
    [collections.blockedPeriods, 'us3-test-block'],
    [collections.tenants, 'us1-test-tenant-a'],
    [collections.tenants, 'us1-test-tenant-b'],
    [collections.publicBusinesses, 'us1-test-tenant-a'],
    [collections.publicBusinesses, 'us1-test-tenant-b'],
  ];
  for (const [collection, id] of testIds) {
    batch.delete(firestore.collection(collection).doc(id));
  }
  await batch.commit();
}

function nextWorkingDate(): string {
  const now = getZonedDateTimeParts(new Date(), 'America/Sao_Paulo');
  const candidate = new Date(Date.UTC(now.year, now.month - 1, now.day + 1));
  while (isoWeekday(candidate.toISOString().slice(0, 10)) > 6) {
    candidate.setUTCDate(candidate.getUTCDate() + 1);
  }
  return candidate.toISOString().slice(0, 10);
}

emulatorOnly('US3 tenant administration on the Firestore emulator', () => {
  beforeAll(() => {
    process.env.GCLOUD_PROJECT ??= 'demo-tamarcado';
  });

  beforeEach(prepareTenantFixtures);
  afterAll(cleanTestDocuments);

  it('creates and edits products while synchronizing only the safe public projection', async () => {
    await saveProduct('tenant-aurora', {
      id: 'us3-test-product',
      name: 'Serviço de teste',
      description: 'Descrição pública',
      imageUrl: 'https://images.example.test/us3.jpg',
      priceCents: 8000,
      durationMinutes: 35,
      commissionType: 'fixed',
      commissionValue: 1200,
      active: true,
    });
    let business = await findPublicBusiness('studio-aurora');
    expect(await listPublicProductRecords(business)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'us3-test-product', priceCents: 8000 }),
      ]),
    );
    expect(
      (await firestore.collection(collections.publicProducts).doc('us3-test-product').get()).data(),
    ).not.toHaveProperty('commissionValue');

    await saveProduct('tenant-aurora', {
      id: 'us3-test-product',
      name: 'Serviço inativo',
      description: 'Atualizado',
      imageUrl: 'https://images.example.test/us3-updated.jpg',
      priceCents: 9000,
      durationMinutes: 40,
      commissionType: 'percentage',
      commissionValue: 2500,
      active: false,
    });
    business = await findPublicBusiness('studio-aurora');
    expect((await listPublicProductRecords(business)).map((product) => product.id)).not.toContain(
      'us3-test-product',
    );
    expect(
      (
        await firestore.collection(collections.appointments).doc('appointment-completed').get()
      ).data(),
    ).toMatchObject({ productPriceCentsSnapshot: 12000, commissionValueSnapshot: 3500 });
  });

  it('rejects foreign service associations and preserves deactivated assignment history', async () => {
    await expect(
      saveProfessional('tenant-aurora', {
        id: 'us3-test-professional',
        name: 'Pessoa de teste',
        phone: '(11) 99999-0020',
        active: true,
        productIds: ['service-consulta'],
      }),
    ).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(
      (await firestore.collection(collections.professionals).doc('us3-test-professional').get())
        .exists,
    ).toBe(true);
    expect(
      (
        await firestore.collection(collections.professionals).doc('us3-test-professional').get()
      ).data(),
    ).toMatchObject({ name: 'Pessoa de teste' });

    await saveProfessional('tenant-aurora', {
      id: 'professional-ana',
      name: 'Ana Souza',
      phone: '(11) 99999-0001',
      active: false,
      productIds: ['service-corte'],
    });
    const assignmentId = 'tenant-aurora__professional-ana__service-corte';
    expect(
      (await firestore.collection(collections.professionalProducts).doc(assignmentId).get()).data(),
    ).toMatchObject({ tenantId: 'tenant-aurora', active: true });
    expect(
      (
        await firestore.collection(collections.appointments).doc('appointment-pending').get()
      ).data(),
    ).toMatchObject({ professionalNameSnapshot: 'Ana Souza', productPriceCentsSnapshot: 12000 });

    const availableSlots = await listAvailableSlots({
      businessSlug: 'studio-aurora',
      productId: 'service-corte',
      date: nextWorkingDate(),
    });
    expect(new Set(availableSlots.map((slot) => slot.professionalId))).toEqual(
      new Set(['professional-bruna']),
    );

    await saveProfessional('tenant-aurora', {
      id: 'professional-ana',
      name: 'Ana Souza',
      phone: '(11) 99999-0001',
      active: false,
      productIds: [],
    });
    expect(
      (
        await firestore
          .collection(collections.professionalProducts)
          .doc('tenant-aurora__professional-ana__service-corte')
          .get()
      ).data(),
    ).toMatchObject({ active: false });
    expect(
      (
        await firestore.collection(collections.appointments).doc('appointment-pending').get()
      ).data(),
    ).toMatchObject({ professionalNameSnapshot: 'Ana Souza', productPriceCentsSnapshot: 12000 });
  });

  it('rejects overlapping schedule intervals and protects one-time blocks by tenant', async () => {
    await saveWorkingHours('tenant-aurora', {
      id: 'us3-test-hours',
      professionalId: 'professional-ana',
      dayOfWeek: 7,
      startLocalTime: '09:00',
      endLocalTime: '12:00',
      active: true,
    });
    await expect(
      saveWorkingHours('tenant-aurora', {
        professionalId: 'professional-ana',
        dayOfWeek: 7,
        startLocalTime: '11:00',
        endLocalTime: '13:00',
        active: true,
      }),
    ).rejects.toMatchObject({ code: 'already-exists' });
    await expect(
      saveWorkingHours('tenant-aurora', {
        professionalId: 'professional-horizonte',
        dayOfWeek: 7,
        startLocalTime: '13:00',
        endLocalTime: '15:00',
        active: true,
      }),
    ).rejects.toMatchObject({ code: 'failed-precondition' });

    const { id: blockId } = await saveBlockedPeriod('tenant-aurora', 'test-admin', {
      professionalId: 'professional-ana',
      startsAt: '2027-01-10T13:00:00.000Z',
      endsAt: '2027-01-10T14:00:00.000Z',
      reason: 'Demonstração',
    });
    await expect(deleteBlockedPeriod('tenant-horizonte', blockId)).rejects.toMatchObject({
      code: 'not-found',
    });
    await deleteBlockedPeriod('tenant-aurora', blockId);
    expect((await firestore.collection(collections.blockedPeriods).doc(blockId).get()).exists).toBe(
      false,
    );
  });

  it('synchronizes business settings and rejects a slug used by another tenant', async () => {
    await expect(
      saveTenantSettings('tenant-aurora', {
        name: 'Studio Aurora',
        slug: 'clinica-horizonte',
        segment: 'beauty',
        timezone: 'America/Sao_Paulo',
        bookingIntervalMinutes: 15,
        active: true,
      }),
    ).rejects.toMatchObject({ code: 'already-exists' });

    await saveTenantSettings('tenant-aurora', {
      name: 'Aurora Demonstração',
      slug: 'aurora-us3-demo',
      segment: 'beauty',
      description: 'Perfil público atualizado.',
      timezone: 'America/Sao_Paulo',
      bookingIntervalMinutes: 20,
      active: true,
    });
    expect(
      (await firestore.collection(collections.publicBusinesses).doc('tenant-aurora').get()).data(),
    ).toMatchObject({ name: 'Aurora Demonstração', slug: 'aurora-us3-demo', published: true });
  });

  it('normalizes colors, returns them to the active workspace, and isolates writes by tenant', async () => {
    await saveTenantSettings('us1-test-tenant-a', {
      name: 'Empresa A personalizada',
      slug: 'us1-empresa-a',
      segment: 'beauty',
      timezone: 'America/Sao_Paulo',
      bookingIntervalMinutes: 15,
      active: true,
      primaryColor: 'AABBCC',
      secondaryColor: '#DDEEFF',
    });

    expect(
      (await firestore.collection(collections.tenants).doc('us1-test-tenant-a').get()).data(),
    ).toMatchObject({ primaryColor: '#aabbcc', secondaryColor: '#ddeeff' });
    expect(
      (
        await firestore.collection(collections.publicBusinesses).doc('us1-test-tenant-a').get()
      ).data(),
    ).toMatchObject({ primaryColor: '#aabbcc', secondaryColor: '#ddeeff' });
    expect((await getBackofficeWorkspace('us1-test-tenant-a')).company).toMatchObject({
      primaryColor: '#aabbcc',
      secondaryColor: '#ddeeff',
    });
    expect(
      (await firestore.collection(collections.tenants).doc('us1-test-tenant-b').get()).data(),
    ).toMatchObject({ primaryColor: '#445566', secondaryColor: '#556677' });
    expect(
      (
        await firestore.collection(collections.publicBusinesses).doc('us1-test-tenant-b').get()
      ).data(),
    ).toMatchObject({ primaryColor: '#445566', secondaryColor: '#556677' });
  });

  it.each([
    ['primaryColor', '#12zz00'],
    ['secondaryColor', '#12345'],
  ] as const)(
    'rejects invalid %s values without changing previously saved colors',
    async (field, value) => {
      await expect(
        saveTenantSettings('us1-test-tenant-a', {
          name: 'Empresa A',
          slug: 'us1-empresa-a',
          segment: 'beauty',
          timezone: 'America/Sao_Paulo',
          bookingIntervalMinutes: 15,
          active: true,
          [field]: value,
        }),
      ).rejects.toMatchObject({ code: 'invalid-argument' });

      expect(
        (await firestore.collection(collections.tenants).doc('us1-test-tenant-a').get()).data(),
      ).toMatchObject({ primaryColor: '#112233', secondaryColor: '#223344' });
      expect(
        (
          await firestore.collection(collections.publicBusinesses).doc('us1-test-tenant-a').get()
        ).data(),
      ).toMatchObject({ primaryColor: '#112233', secondaryColor: '#223344' });
    },
  );

  it('preserves stored colors when legacy settings payloads omit them', async () => {
    await saveTenantSettings('us1-test-tenant-a', {
      name: 'Empresa A com uma cor atualizada',
      slug: 'us1-empresa-a',
      segment: 'beauty',
      timezone: 'America/Sao_Paulo',
      bookingIntervalMinutes: 15,
      active: true,
      primaryColor: 'AABBCC',
    });

    expect(
      (await firestore.collection(collections.tenants).doc('us1-test-tenant-a').get()).data(),
    ).toMatchObject({ primaryColor: '#aabbcc', secondaryColor: '#223344' });
    expect(
      (
        await firestore.collection(collections.publicBusinesses).doc('us1-test-tenant-a').get()
      ).data(),
    ).toMatchObject({ primaryColor: '#aabbcc', secondaryColor: '#223344' });

    await saveTenantSettings('us1-test-tenant-a', {
      name: 'Empresa A atualizada',
      slug: 'us1-empresa-a',
      segment: 'beauty',
      timezone: 'America/Sao_Paulo',
      bookingIntervalMinutes: 20,
      active: true,
    });

    expect(
      (await firestore.collection(collections.tenants).doc('us1-test-tenant-a').get()).data(),
    ).toMatchObject({ primaryColor: '#aabbcc', secondaryColor: '#223344' });
    expect(
      (
        await firestore.collection(collections.publicBusinesses).doc('us1-test-tenant-a').get()
      ).data(),
    ).toMatchObject({ primaryColor: '#aabbcc', secondaryColor: '#223344' });
  });
});
