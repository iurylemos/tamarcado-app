import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { collections } from '../config/collections';
import type { ContactDocument } from '../model/contact.model';
import type { AuthorizedActor } from './authorization.service';
import { firestore } from './firestore.service';
import { normalizeBrazilianPhone as normalizeShared } from '../../../shared/domain/phone';

function normalizeBrazilianPhone(value: string): string {
  const normalized = normalizeShared(value);
  if (!normalized) throw new HttpsError('invalid-argument', 'Informe um telefone celular v�lido com DDD.');
  return normalized;
}

export function contactDocumentId(tenantId: string, connectionId: string, phoneE164: string) {
  return [tenantId, connectionId, phoneE164].map(encodeURIComponent).join('__');
}

async function requireConnection(actor: AuthorizedActor, connectionId: string) {
  const snapshot = await firestore.collection(collections.connections).doc(connectionId).get();
  if (!snapshot.exists || snapshot.data()?.tenantId !== actor.tenantId) {
    throw new HttpsError('not-found', 'ConexÃ£o nÃ£o encontrada.');
  }
  return snapshot;
}

export async function saveConnection(
  actor: AuthorizedActor,
  input: { connectionId?: string; provider: string },
): Promise<{ connectionId: string }> {
  const provider = input.provider.trim();
  if (!provider) throw new HttpsError('invalid-argument', 'Informe o provedor da conexÃ£o.');
  const collection = firestore.collection(collections.connections);
  if (input.connectionId) {
    await requireConnection(actor, input.connectionId);
    await collection.doc(input.connectionId).update({ provider, updatedAt: FieldValue.serverTimestamp() });
    return { connectionId: input.connectionId };
  }
  const reference = collection.doc();
  await reference.set({
    tenantId: actor.tenantId,
    provider,
    status: 'active',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { connectionId: reference.id };
}

export async function createContact(
  actor: AuthorizedActor,
  input: { connectionId: string; phone: string; name?: string },
): Promise<{ contactId: string }> {
  await requireConnection(actor, input.connectionId);
  const phoneE164 = normalizeBrazilianPhone(input.phone);
  const contactId = contactDocumentId(actor.tenantId, input.connectionId, phoneE164);
  const document: Omit<ContactDocument, 'createdAt' | 'updatedAt'> & Record<string, unknown> = {
    tenantId: actor.tenantId,
    connectionId: input.connectionId,
    phoneE164,
    whatsappOptIn: false,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (input.name?.trim()) document.name = input.name.trim();
  const reference = firestore.collection(collections.contacts).doc(contactId);
  const duplicates = firestore
    .collection(collections.contacts)
    .where('tenantId', '==', actor.tenantId)
    .where('connectionId', '==', input.connectionId)
    .where('phoneE164', '==', phoneE164)
    .limit(1);
  await firestore.runTransaction(async (transaction) => {
    const [existing, byId] = await Promise.all([transaction.get(duplicates), transaction.get(reference)]);
    if (!existing.empty || byId.exists) {
      throw new HttpsError('already-exists', 'Este telefone já existe nesta conexão.');
    }
    transaction.create(reference, document);
  });
  return { contactId };
}

export async function setContactConsent(
  actor: AuthorizedActor,
  contactId: string,
  optIn: boolean,
  consentSource = 'collaborator',
): Promise<void> {
  const reference = firestore.collection(collections.contacts).doc(contactId);
  const snapshot = await reference.get();
  if (!snapshot.exists || snapshot.data()?.tenantId !== actor.tenantId) {
    throw new HttpsError('not-found', 'Contato nÃ£o encontrado.');
  }
  const now = FieldValue.serverTimestamp();
  await reference.update(
    optIn
      ? { whatsappOptIn: true, optInAt: now, consentSource, updatedAt: now }
      : { whatsappOptIn: false, optOutAt: now, updatedAt: now },
  );
}
