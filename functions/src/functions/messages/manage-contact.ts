import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { authorizeActor } from '../../services/authorization.service';
import { createContact, setContactConsent } from '../../services/contact.service';

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    throw new HttpsError('invalid-argument', 'Dados inválidos.');
  }
  return value as Record<string, unknown>;
}

export const createContactCallable = onCall(async (request) => {
  const actor = await authorizeActor(request, ['collaborator', 'backoffice']);
  const data = record(request.data);
  if (typeof data.connectionId !== 'string' || typeof data.phone !== 'string') {
    throw new HttpsError('invalid-argument', 'Informe a conexão e o telefone do contato.');
  }
  return createContact(actor, {
    connectionId: data.connectionId,
    phone: data.phone,
    ...(typeof data.name === 'string' ? { name: data.name } : {}),
  });
});

export const setContactConsentCallable = onCall(async (request) => {
  const actor = await authorizeActor(request, ['collaborator', 'backoffice']);
  const data = record(request.data);
  if (typeof data.contactId !== 'string' || typeof data.optIn !== 'boolean') {
    throw new HttpsError('invalid-argument', 'Informe o contato e o consentimento.');
  }
  await setContactConsent(actor, data.contactId, data.optIn);
  return { ok: true };
});