import { type CallableRequest, HttpsError, onCall } from 'firebase-functions/v2/https';
import { authorizeActor } from '../../services/authorization.service';
import { createContact, setContactConsent } from '../../services/contact.service';
import { callableOptionsCollaboratorAndBackoffice } from '../../options/callable.option';
import { SaveContactData } from '../../interfaces/contact.interface';

export const createContactCallable = onCall(
  callableOptionsCollaboratorAndBackoffice,
  async (request: CallableRequest<Record<string, unknown>>): Promise<SaveContactData> => {
    const actor = await authorizeActor(request, ['collaborator', 'backoffice']);

    if (typeof request.data !== 'object' || request.data === null) {
      throw new HttpsError('invalid-argument', 'Dados inválidos.');
    }

    const { data } = request;

    if (typeof data.connectionId !== 'string' || typeof data.phone !== 'string') {
      throw new HttpsError('invalid-argument', 'Informe a conexão e o telefone do contato.');
    }
    return createContact(actor, {
      connectionId: data.connectionId,
      phone: data.phone,
      ...(typeof data.name === 'string' ? { name: data.name } : {}),
    });
  },
);

export const setContactConsentCallable = onCall(
  callableOptionsCollaboratorAndBackoffice,
  async (request: CallableRequest<Record<string, unknown>>): Promise<{ ok: boolean }> => {
    const actor = await authorizeActor(request, ['collaborator', 'backoffice']);

    if (typeof request.data !== 'object' || request.data === null) {
      throw new HttpsError('invalid-argument', 'Dados inválidos.');
    }

    const { data } = request;

    if (typeof data.contactId !== 'string' || typeof data.optIn !== 'boolean') {
      throw new HttpsError('invalid-argument', 'Informe o contato e o consentimento.');
    }

    await setContactConsent(actor, data.contactId, data.optIn);

    return { ok: true };
  },
);
