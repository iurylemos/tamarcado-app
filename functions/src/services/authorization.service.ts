import { logger } from 'firebase-functions';
import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import type { UserDocument } from '../model/user.model';
import { collections } from '../config/collections';
import { firestore } from './firestore.service';

export interface AuthorizedActor extends UserDocument {
  uid: string;
}

function isUserDocument(value: unknown): value is UserDocument {
  if (typeof value !== 'object' || value === null) return false;
  const user = value as Record<string, unknown>;
  return (
    typeof user.tenantId === 'string' &&
    (user.role === 'collaborator' || user.role === 'backoffice') &&
    typeof user.name === 'string' &&
    typeof user.phoneE164 === 'string' &&
    typeof user.active === 'boolean' &&
    (user.professionalId === undefined || typeof user.professionalId === 'string')
  );
}

export async function authorizeActor(
  request: CallableRequest<unknown>,
  allowedRoles?: readonly UserDocument['role'][],
): Promise<AuthorizedActor> {
  const auth = request.auth;
  if (!auth) throw new HttpsError('unauthenticated', 'Entre na sua conta para continuar.');

  const snapshot = await firestore.collection(collections.users).doc(auth.uid).get();
  const user: unknown = snapshot.data();

  if (!isUserDocument(user) || user.active !== true) {
    throw new HttpsError('permission-denied', 'Esta conta está inativa ou sem acesso.');
  }

  const claimMatches = {
    active: auth.token.active === true,
    tenantId: auth.token.tenantId === user.tenantId,
    role: auth.token.role === user.role,
    professionalId: (auth.token.professionalId ?? null) === (user.professionalId ?? null),
  };

  if (Object.values(claimMatches).some((matches) => !matches)) {
    logger.warn('Authorization rejected: token claims do not match the user document.', {
      uid: auth.uid,
      claimMatches,
    });
    throw new HttpsError('permission-denied', 'Sua sessão não corresponde ao acesso atual.');
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    throw new HttpsError('permission-denied', 'Seu perfil não permite esta operação.');
  }
  return { ...user, uid: auth.uid };
}

export async function authorizeProfessional(
  request: CallableRequest<unknown>,
  professionalId: string,
): Promise<AuthorizedActor> {
  const actor = await authorizeActor(request, ['collaborator']);

  if (actor.professionalId && actor.professionalId !== professionalId) {
    throw new HttpsError('permission-denied', 'Você não tem acesso a este profissional.');
  }

  return actor;
}
