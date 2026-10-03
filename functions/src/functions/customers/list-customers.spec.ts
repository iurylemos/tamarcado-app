import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { AuthorizedActor } from '../../services/authorization.service';
import { listCustomerHistory } from '../../services/customer-history.service';
import { createSeedDocuments } from '../../../test/fixtures/seed-data';
import { getZonedDateTimeParts } from '../../../../shared/domain/timezone';

const emulatorOnly = describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST);
let db: Firestore;
const auroraActor: AuthorizedActor = {
  uid: 'test-collaborator-ana',
  tenantId: 'tenant-aurora',
  role: 'collaborator',
  professionalId: 'professional-ana',
  name: 'Ana Souza',
  phoneE164: '+5511999990001',
  active: true,
};
const unscopedActor: AuthorizedActor = {
  ...auroraActor,
  uid: 'test-collaborator-manager',
  professionalId: undefined,
};

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

emulatorOnly('collaborator customer history on the Firestore emulator', () => {
  beforeAll(() => {
    const app =
      getApps()[0] ?? initializeApp({ projectId: process.env.GCLOUD_PROJECT ?? 'demo-tamarcado' });
    db = getFirestore(app);
  });

  beforeEach(async () => resetFirestore());

  it('counts completed attendance, reports its business-local month/year, and enforces scope', async () => {
    const phone = '+5511999990009';
    const pending = await db.collection('appointments').doc('appointment-pending').get();
    const pendingData = pending.data();
    if (!pendingData) throw new Error('Expected the pending seed appointment.');
    await pending.ref.update({ whatsappOptIn: true });

    const globalHistory = await listCustomerHistory(unscopedActor);
    const customer = globalHistory.customers.find((item) => item.phoneE164 === phone);
    expect(customer).toMatchObject({
      completedAttendanceCount: 1,
      canContactOnWhatsApp: true,
    });

    const completed = await db.collection('appointments').doc('appointment-completed').get();
    const completedDate = completed.data()?.startsAt.toDate() as Date;
    const localDate = getZonedDateTimeParts(completedDate, 'America/Sao_Paulo');
    expect(customer).toMatchObject({
      latestAttendanceMonth: localDate.month,
      latestAttendanceYear: localDate.year,
    });

    const scopedHistory = await listCustomerHistory(auroraActor);
    expect(scopedHistory.customers[0]?.completedAttendanceCount).toBe(0);
  });

  it('keeps phone data within the authenticated tenant and professional appointment scope', async () => {
    const result = await listCustomerHistory(auroraActor);
    expect(result.customers.map((customer) => customer.phoneE164)).toEqual(['+5511999990009']);
    expect(result.customers[0]?.canContactOnWhatsApp).toBe(false);
  });
});
