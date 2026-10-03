import { createHmac } from 'node:crypto';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createSeedDocuments } from '../../../test/fixtures/seed-data';
import type { AuthorizedActor } from '../../services/authorization.service';
import { sendAppointmentMessage } from '../../services/message.service';
import { WhatsAppProviderError, type WhatsAppProvider } from '../../services/whatsapp-provider.interface';
import { processProviderWebhook } from './process-provider-webhook';

const emulatorOnly = describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST);
let db: Firestore;
const secret = 'test-secret';
const actor: AuthorizedActor = {
  uid: 'test-collaborator-ana',
  tenantId: 'tenant-aurora',
  role: 'collaborator',
  professionalId: 'professional-ana',
  name: 'Ana Souza',
  phoneE164: '+5511999990001',
  active: true,
};
const okProvider: WhatsAppProvider = {
  name: 'ok',
  sendCode: async () => undefined,
  sendTemplateMessage: async () => ({ providerMessageId: 'provider-1' }),
};
const failingProvider: WhatsAppProvider = {
  ...okProvider,
  sendTemplateMessage: async () => {
    throw new WhatsAppProviderError('REJECTED', 'no');
  },
};

function signed(payload: object) {
  const body = JSON.stringify(payload);
  return { body, signature: createHmac('sha256', secret).update(body).digest('hex') };
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
  await db.collection('contacts').doc('contact-aurora-demo').update({ whatsappOptIn: true });
}

emulatorOnly('provider messaging and webhooks on the Firestore emulator', () => {
  beforeAll(() => {
    const app =
      getApps()[0] ?? initializeApp({ projectId: process.env.GCLOUD_PROJECT ?? 'demo-tamarcado' });
    db = getFirestore(app);
  });
  beforeEach(resetFirestore);

  const send = (provider: WhatsAppProvider, templateCategory: unknown = 'appointment_reminder') =>
    sendAppointmentMessage(
      actor,
      { appointmentId: 'appointment-pending', templateCategory, content: 'Lembrete' },
      provider,
    );

  it('requires an approved template and current opt-in', async () => {
    await expect(send(okProvider, 'free_text')).rejects.toMatchObject({ code: 'invalid-argument' });
    await db.collection('contacts').doc('contact-aurora-demo').update({ whatsappOptIn: false });
    await expect(send(okProvider)).rejects.toMatchObject({ code: 'failed-precondition' });
  });

  it('records provider success and failure without touching the appointment', async () => {
    const before = (await db.collection('appointments').doc('appointment-pending').get()).data();
    const sent = await send(okProvider);
    expect(sent.status).toBe('sent');
    const failed = await send(failingProvider);
    expect(failed.status).toBe('failed');
    expect((await db.collection('messages').doc(failed.messageId).get()).data()?.failureCode).toBe(
      'REJECTED',
    );
    const after = (await db.collection('appointments').doc('appointment-pending').get()).data();
    expect(after).toEqual(before);
  });

  it('authenticates callbacks, applies statuses idempotently, and ignores regressions', async () => {
    const { messageId } = await send(okProvider);
    const delivered = signed({ eventId: 'e1', providerMessageId: 'provider-1', status: 'delivered' });
    expect(await processProviderWebhook(delivered.body, 'bad', secret)).toEqual({ status: 401 });
    expect(await processProviderWebhook(delivered.body, delivered.signature, secret)).toEqual({
      status: 200,
      result: 'applied',
    });
    expect(await processProviderWebhook(delivered.body, delivered.signature, secret)).toEqual({
      status: 200,
      result: 'duplicate',
    });
    const late = signed({ eventId: 'e2', providerMessageId: 'provider-1', status: 'sent' });
    expect((await processProviderWebhook(late.body, late.signature, secret)).result).toBe('ignored');
    expect((await db.collection('messages').doc(messageId).get()).data()?.status).toBe('delivered');
  });
});