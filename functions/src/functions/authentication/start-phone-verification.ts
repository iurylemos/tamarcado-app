import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { phoneVerificationService } from '../../services/phone-verification.service';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export const startPhoneVerificationCallable = onCall(async (request) => {
  const data: unknown = request.data;
  if (
    !isRecord(data) ||
    typeof data.phone !== 'string' ||
    (data.role !== 'collaborator' && data.role !== 'backoffice')
  ) {
    throw new HttpsError(
      'invalid-argument',
      'Informe telefone e perfil para iniciar a verificação.',
    );
  }

  return {
    challengeId: await phoneVerificationService.start(data.phone, data.role),
  };
});
