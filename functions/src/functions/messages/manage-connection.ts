import { type CallableRequest, HttpsError, onCall } from 'firebase-functions/v2/https';
import { authorizeActor } from '../../services/authorization.service';
import { saveConnection } from '../../services/contact.service';
import { callableOptionsBackoffice } from '../../options/callable.option';
import { SaveConnectionData } from '../../interfaces/connection.interface';

export const saveConnectionCallable = onCall(
  callableOptionsBackoffice,
  async (request: CallableRequest<unknown>): Promise<SaveConnectionData> => {
    const actor = await authorizeActor(request, ['backoffice']);

    const data: unknown = request.data;

    const input = (typeof data === 'object' && data !== null ? data : {}) as Record<
      string,
      unknown
    >;

    if (typeof input.provider !== 'string') {
      throw new HttpsError('invalid-argument', 'Informe o provedor da conexão.');
    }

    return saveConnection(actor, {
      provider: input.provider,
      ...(typeof input.connectionId === 'string' ? { connectionId: input.connectionId } : {}),
    });
  },
);
