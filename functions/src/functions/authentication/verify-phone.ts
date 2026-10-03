import { getAuth } from 'firebase-admin/auth';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { collections } from '../../config/collections';
import type { UserDocument } from '../../model/user.model';
import { firestore } from '../../services/firestore.service';
import { phoneVerificationService } from '../../services/phone-verification.service';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isUserDocument(value: unknown): value is UserDocument {
  if (!isRecord(value)) return false;
  return (
    typeof value.tenantId === 'string' &&
    (value.role === 'collaborator' || value.role === 'backoffice') &&
    typeof value.name === 'string' &&
    typeof value.phoneE164 === 'string' &&
    typeof value.active === 'boolean' &&
    (value.professionalId === undefined || typeof value.professionalId === 'string')
  );
}

async function findActiveUser(phoneE164: string, role: UserDocument['role']) {
  const matches = await firestore
    .collection(collections.users)
    .where('phoneE164', '==', phoneE164)
    .get();
  const matchingUsers = matches.docs.filter((document) => {
    const data: unknown = document.data();
    return isUserDocument(data) && data.role === role;
  });

  if (matchingUsers.length !== 1) {
    throw new HttpsError(
      matchingUsers.length > 1 ? 'failed-precondition' : 'permission-denied',
      matchingUsers.length > 1
        ? 'Este telefone está associado a mais de uma conta deste perfil.'
        : 'Não há uma conta ativa com acesso a este espaço.',
    );
  }

  const userDocument = matchingUsers[0];
  if (!userDocument) throw new HttpsError('permission-denied', 'A conta não tem acesso.');
  const user = userDocument.data();
  if (!isUserDocument(user) || !user.active) {
    throw new HttpsError('permission-denied', 'Esta conta está inativa ou sem acesso.');
  }

  const tenantSnapshot = await firestore.collection(collections.tenants).doc(user.tenantId).get();
  const tenant: unknown = tenantSnapshot.data();
  if (!isRecord(tenant) || tenant.active !== true) {
    throw new HttpsError('permission-denied', 'A empresa está inativa ou sem acesso.');
  }

  if (user.professionalId) {
    const professionalSnapshot = await firestore
      .collection(collections.professionals)
      .doc(user.professionalId)
      .get();
    const professional = professionalSnapshot.data();
    if (!professional || professional.tenantId !== user.tenantId || professional.active !== true) {
      throw new HttpsError(
        'permission-denied',
        'O perfil profissional está inativo ou sem acesso.',
      );
    }
  }

  return { uid: userDocument.id, user };
}

export const verifyPhoneCallable = onCall(async (request) => {
  const data: unknown = request.data;
  if (
    !isRecord(data) ||
    typeof data.phone !== 'string' ||
    typeof data.challengeId !== 'string' ||
    typeof data.code !== 'string' ||
    (data.role !== 'collaborator' && data.role !== 'backoffice')
  ) {
    throw new HttpsError('invalid-argument', 'Informe telefone, perfil e código de verificação.');
  }

  const verified = await phoneVerificationService.verify(
    data.phone,
    data.role,
    data.challengeId,
    data.code,
  );
  const { uid, user } = await findActiveUser(verified.phoneE164, verified.role);
  const claims: Record<string, string | boolean> = {
    tenantId: user.tenantId,
    role: user.role,
    active: user.active,
  };
  if (user.professionalId) claims.professionalId = user.professionalId;

  return { customToken: await getAuth().createCustomToken(uid, claims) };
});
