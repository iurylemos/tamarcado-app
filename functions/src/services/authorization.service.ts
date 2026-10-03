import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import type { UserDocument } from '../model/user.model';
import { collections } from '../config/collections';
import { firestore } from './firestore.service';

export interface AuthorizedActor extends UserDocument {
  uid: string;
}

export async function authorizeActor(
  request: CallableRequest<unknown>,
  allowedRoles?: readonly UserDocument['role'][],
): Promise<AuthorizedActor> {
  const auth = request.auth;
  if (!auth) throw new HttpsError('unauthenticated', 'Entre na sua conta para continuar.');

  const snapshot = await firestore.collection(collections.users).doc(auth.uid).get();
  const user = snapshot.data() as UserDocument | undefined;

  if (!user?.active)
    throw new HttpsError('permission-denied', 'Esta conta está inativa ou sem acesso.');

  if (auth.token.tenantId !== user.tenantId || auth.token.role !== user.role) {
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
