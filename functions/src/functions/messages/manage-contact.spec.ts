import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createSeedDocuments } from '../../../test/fixtures/seed-data';
import type { AuthorizedActor } from '../../services/authorization.service';
import { createContact, saveConnection, setContactConsent } from '../../services/contact.service';

const emulatorOnly = describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST);
let db: Firestore;
const actor: AuthorizedActor = {
  uid: 'test-collaborator-ana',
  tenantId: 'tenant-aurora',
  role: 'collaborator',
  professionalId: 'professional-ana',
  name: 'Ana Souza',
  phoneE164: '+5511999990001',
  active: true,
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

emulatorOnly('tenant-owned contacts on the Firestore emulator', () => {
  beforeAll(() => {
    const app =
      getApps()[0] ?? initializeApp({ projectId: process.env.GCLOUD_PROJECT ?? 'demo-tamarcado' });
    db = getFirestore(app);
  });
  beforeEach(resetFirestore);

  it('creates tenant-owned connections and contacts that default to no consent', async () => {
    const { connectionId } = await saveConnection(actor, { provider: 'emulator-test-double' });
    expect((await db.collection('connections').doc(connectionId).get()).data()?.tenantId).toBe(
      'tenant-aurora',
    );
    const { contactId } = await createContact(actor, {
      connectionId,
      phone: '(11) 98888-7777',
      name: 'Maria',
    });
    expect((await db.collection('contacts').doc(contactId).get()).data()).toMatchObject({
      tenantId: 'tenant-aurora',
      connectionId,
      phoneE164: '+5511988887777',
      whatsappOptIn: false,
    });
  });

  it('rejects duplicate phones in the same connection and foreign connections', async () => {
    await expect(
      createContact(actor, { connectionId: 'connection-aurora', phone: '+5511999990009' }),
    ).rejects.toMatchObject({ code: 'already-exists' });
    await db.collection('connections').doc('connection-other').set({ tenantId: 'tenant-horizonte' });
    await expect(
      createContact(actor, { connectionId: 'connection-other', phone: '+5511977776666' }),
    ).rejects.toMatchObject({ code: 'not-found' });
  });

  it('records explicit opt-in and opt-out and blocks cross-tenant changes', async () => {
    const contact = db.collection('contacts').doc('contact-aurora-demo');
    await setContactConsent(actor, 'contact-aurora-demo', true);
    expect((await contact.get()).data()).toMatchObject({ whatsappOptIn: true });
    expect((await contact.get()).data()?.optInAt).toBeDefined();
    await setContactConsent(actor, 'contact-aurora-demo', false);
    expect((await contact.get()).data()).toMatchObject({ whatsappOptIn: false });
    expect((await contact.get()).data()?.optOutAt).toBeDefined();

    await expect(
      setContactConsent({ ...actor, tenantId: 'tenant-horizonte' }, 'contact-aurora-demo', true),
    ).rejects.toMatchObject({ code: 'not-found' });
  });
});