import { getAuth, type Auth } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { collections } from '../config/collections';
import type { ProfessionalDocument } from '../model/professional.model';
import type { TenantDocument } from '../model/tenant.model';
import type { UserDocument } from '../model/user.model';
import { firestore } from './firestore.service';

const emailPattern = /^[a-z0-9][a-z0-9._+-]*$/;
export const minPasswordLength = 8;

export function normalizeCollaboratorEmail(value: unknown, domain: string | undefined): string {
  if (typeof value !== 'string') throw new HttpsError('invalid-argument', 'Informe o e-mail.');
  const email = value.trim().toLowerCase();
  const [local, host, ...rest] = email.split('@');
  if (!local || !host || rest.length > 0 || !emailPattern.test(local)) {
    throw new HttpsError('invalid-argument', 'Informe um e-mail válido.');
  }
  if (!domain) {
    throw new HttpsError(
      'failed-precondition',
      'Defina o domínio de e-mail da empresa nas configurações antes de criar acessos.',
    );
  }
  if (host !== domain.toLowerCase()) {
    throw new HttpsError('invalid-argument', `O e-mail deve terminar em @${domain}.`);
  }
  return email;
}

export function validatePassword(value: unknown): string {
  if (typeof value !== 'string' || value.length < minPasswordLength || value.length > 128) {
    throw new HttpsError(
      'invalid-argument',
      `A senha deve ter de ${minPasswordLength} a 128 caracteres.`,
    );
  }
  return value;
}

async function loadContext(tenantId: string, professionalId: unknown) {
  if (typeof professionalId !== 'string' || !professionalId) {
    throw new HttpsError('invalid-argument', 'Colaborador inválido.');
  }
  const [tenantSnapshot, professionalSnapshot] = await Promise.all([
    firestore.collection(collections.tenants).doc(tenantId).get(),
    firestore.collection(collections.professionals).doc(professionalId).get(),
  ]);
  const professional = professionalSnapshot.data() as ProfessionalDocument | undefined;
  if (!professional || professional.tenantId !== tenantId) {
    throw new HttpsError('not-found', 'Colaborador não encontrado nesta empresa.');
  }
  const tenant = tenantSnapshot.data() as TenantDocument | undefined;
  return { professional, professionalId, domain: tenant?.emailDomain };
}

async function findLinkedUser(tenantId: string, professionalId: string) {
  const result = await firestore
    .collection(collections.users)
    .where('tenantId', '==', tenantId)
    .where('professionalId', '==', professionalId)
    .limit(1)
    .get();
  return result.docs[0];
}

function authError(error: unknown): HttpsError {
  const code = (error as { code?: string })?.code;
  if (code === 'auth/email-already-exists') {
    return new HttpsError('already-exists', 'Já existe uma conta com este e-mail.');
  }
  if (code === 'auth/invalid-password' || code === 'auth/weak-password') {
    return new HttpsError('invalid-argument', 'Senha inválida.');
  }
  return new HttpsError('internal', 'Não foi possível atualizar o acesso do colaborador.');
}

// Creates the collaborator's Firebase login, or changes its e-mail/password when it already exists.
export async function saveCollaboratorAccount(
  tenantId: string,
  rawInput: unknown,
  auth: Auth = getAuth(),
): Promise<{ uid: string; email: string }> {
  const input = (typeof rawInput === 'object' && rawInput !== null ? rawInput : {}) as Record<
    string,
    unknown
  >;
  const { professional, professionalId, domain } = await loadContext(
    tenantId,
    input.professionalId,
  );
  const email = normalizeCollaboratorEmail(input.email, domain);
  const existing = await findLinkedUser(tenantId, professionalId);
  const claims = { tenantId, role: 'collaborator', active: professional.active, professionalId };

  let uid: string;
  try {
    if (existing) {
      uid = existing.id;
      const password =
        input.password === undefined || input.password === ''
          ? undefined
          : validatePassword(input.password);
      await auth.updateUser(uid, {
        email,
        ...(password ? { password } : {}),
        disabled: !professional.active,
      });
    } else {
      const password = validatePassword(input.password);
      const created = await auth.createUser({
        email,
        password,
        displayName: professional.name,
        disabled: !professional.active,
      });
      uid = created.uid;
    }
    await auth.setCustomUserClaims(uid, claims);
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw authError(error);
  }

  const user: UserDocument = {
    tenantId,
    role: 'collaborator',
    professionalId,
    name: professional.name,
    phoneE164: professional.phoneE164,
    email,
    active: professional.active,
  };
  await firestore.collection(collections.users).doc(uid).set(user);
  return { uid, email };
}

export async function resetCollaboratorPassword(
  tenantId: string,
  rawInput: unknown,
  auth: Auth = getAuth(),
): Promise<{ uid: string }> {
  const input = (typeof rawInput === 'object' && rawInput !== null ? rawInput : {}) as Record<
    string,
    unknown
  >;
  const { professional, professionalId } = await loadContext(tenantId, input.professionalId);
  const password = validatePassword(input.password);
  const existing = await findLinkedUser(tenantId, professionalId);
  if (!existing) throw new HttpsError('not-found', 'Este colaborador ainda não tem acesso.');
  try {
    await auth.updateUser(existing.id, { password });
    await auth.setCustomUserClaims(existing.id, {
      tenantId,
      role: 'collaborator',
      active: professional.active,
      professionalId,
    });
    await auth.revokeRefreshTokens(existing.id);
  } catch (error) {
    throw authError(error);
  }
  return { uid: existing.id };
}

export async function getCollaboratorEmails(tenantId: string): Promise<Record<string, string>> {
  const result = await firestore
    .collection(collections.users)
    .where('tenantId', '==', tenantId)
    .where('role', '==', 'collaborator')
    .get();
  const emails: Record<string, string> = {};
  result.docs.forEach((doc) => {
    const data = doc.data() as UserDocument;
    if (data.professionalId && data.email) emails[data.professionalId] = data.email;
  });
  return emails;
}

// Keeps the login in step with the collaborator's active flag and profile data.
export async function syncCollaboratorAccount(
  tenantId: string,
  professionalId: string,
  profile: { name: string; phoneE164: string; active: boolean },
  auth: Auth = getAuth(),
): Promise<void> {
  const existing = await findLinkedUser(tenantId, professionalId);
  if (!existing) return;
  await auth.updateUser(existing.id, { disabled: !profile.active, displayName: profile.name });
  await auth.setCustomUserClaims(existing.id, {
    tenantId,
    role: 'collaborator',
    active: profile.active,
    professionalId,
  });
  await existing.ref.update({ ...profile, updatedAt: FieldValue.serverTimestamp() });
  if (!profile.active) await auth.revokeRefreshTokens(existing.id);
}
