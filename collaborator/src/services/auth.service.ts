import { signInWithCustomToken, signOut } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import type { UserRole } from '@shared/interfaces/user.interface';
import { auth, functions } from '../config/firebase.config';

export async function requestPhoneVerification(phone: string, role: UserRole): Promise<string> {
  const call = httpsCallable<{ phone: string; role: UserRole }, { challengeId: string }>(
    functions,
    'startPhoneVerification',
  );
  const result = await call({ phone, role });
  return result.data.challengeId;
}

export async function signInWithPhoneVerification(
  phone: string,
  role: UserRole,
  challengeId: string,
  code: string,
): Promise<void> {
  const call = httpsCallable<
    { phone: string; role: UserRole; challengeId: string; code: string },
    { customToken: string }
  >(functions, 'verifyPhone');
  const result = await call({ phone, role, challengeId, code });
  await signInWithCustomToken(auth, result.data.customToken);
}

export function signOutCurrentUser(): Promise<void> {
  return signOut(auth);
}

export function authErrorMessage(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error.code === 'functions/internal' ||
      error.code === 'functions/unavailable' ||
      error.code === 'functions/unknown')
  ) {
    return 'Não foi possível conectar ao serviço de verificação. Verifique sua conexão e tente novamente.';
  }
  if (error instanceof Error && error.message) return error.message.replace(/\s+\[\d{3}\]$/, '');
  return 'Não foi possível concluir a verificação. Tente novamente.';
}
