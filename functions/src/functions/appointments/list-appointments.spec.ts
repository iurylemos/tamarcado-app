import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore, Timestamp } from 'firebase-admin/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { collections } from '../../config/collections';
import { listAppointments } from '../../services/appointment-operations.service';
import type { AuthorizedActor } from '../../services/authorization.service';

const emulatorOnly = describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST);
const tenantId = 'appointments-customization-test-tenant';
let db: Firestore;

emulatorOnly('appointment customization listing compatibility', () => {
  beforeAll(() => {
    const app =
      getApps()[0] ?? initializeApp({ projectId: process.env.GCLOUD_PROJECT ?? 'demo-tamarcado' });
    db = getFirestore(app);
  });

  beforeEach(async () => {
    const now = Timestamp.fromDate(new Date(Date.now() + 86_400_000));
    const batch = db.batch();
    batch.set(db.collection(collections.tenants).doc(tenantId), {
      name: 'Empresa de teste',
      timezone: 'America/Sao_Paulo',
    });
    batch.set(db.collection(collections.appointments).doc('customized-appointment-test'), {
      tenantId,
      customerPhoneE164: '+5511999990009',
      productId: 'customized-product-test',
      professionalId: 'professional-test',
      professionalNameSnapshot: 'Profissional de teste',
      startsAt: now,
      endsAt: Timestamp.fromMillis(now.toMillis() + 3_600_000),
      durationMinutes: 60,
      status: 'pending',
      productNameSnapshot: 'Serviço personalizado',
      customizationSnapshot: [
        {
          attributeId: 'color',
          attributeLabel: 'Cor histórica',
          optionId: 'brown',
          optionLabel: 'Castanho histórico',
        },
      ],
      productImageUrlSnapshot: 'https://images.example.test/historical-image.jpg',
      productPriceCentsSnapshot: 12000,
      commissionTypeSnapshot: 'percentage',
      commissionValueSnapshot: 3500,
      commissionAmountCentsSnapshot: 4200,
      whatsappOptIn: false,
      createdAt: now,
      updatedAt: now,
      createdBy: 'test',
    });
    batch.set(db.collection(collections.appointments).doc('legacy-appointment-test'), {
      tenantId,
      customerPhoneE164: '+5511999990009',
      productId: 'legacy-product-test',
      professionalId: 'professional-test',
      professionalNameSnapshot: 'Profissional de teste',
      startsAt: now,
      endsAt: Timestamp.fromMillis(now.toMillis() + 3_600_000),
      durationMinutes: 60,
      status: 'pending',
      productNameSnapshot: 'Serviço legado',
      productPriceCentsSnapshot: 12000,
      commissionTypeSnapshot: 'percentage',
      commissionValueSnapshot: 3500,
      commissionAmountCentsSnapshot: 4200,
      whatsappOptIn: false,
      createdAt: now,
      updatedAt: now,
      createdBy: 'test',
    });
    await batch.commit();
  });

  afterAll(async () => {
    const batch = db.batch();
    batch.delete(db.collection(collections.tenants).doc(tenantId));
    batch.delete(db.collection(collections.appointments).doc('customized-appointment-test'));
    batch.delete(db.collection(collections.appointments).doc('legacy-appointment-test'));
    await batch.commit();
  });

  it('returns immutable customization and image snapshots while preserving legacy response fields', async () => {
    const response = await listAppointments({ tenantId, uid: 'test-user' } as AuthorizedActor, {
      date: undefined,
    });

    const customized = response.appointments.find(
      (appointment) => appointment.id === 'customized-appointment-test',
    );

    const legacy = response.appointments.find(
      (appointment) => appointment.id === 'legacy-appointment-test',
    );

    expect(customized).toMatchObject({
      customizationSnapshot: [
        {
          attributeLabel: 'Cor histórica',
          optionLabel: 'Castanho histórico',
        },
      ],
      productImageUrlSnapshot: 'https://images.example.test/historical-image.jpg',
    });
    expect(legacy).toBeDefined();
    expect(legacy).not.toHaveProperty('customizationSnapshot');
    expect(legacy).not.toHaveProperty('productImageUrlSnapshot');
  });
});
