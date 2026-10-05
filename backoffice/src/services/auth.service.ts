import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../config/firebase.config';

export async function signInWithEmail(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email.trim(), password);
}

export function signOutCurrentUser(): Promise<void> {
  return signOut(auth);
}

export function authErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
  if (
    code === 'auth/invalid-credential' ||
    code === 'auth/wrong-password' ||
    code === 'auth/user-not-found' ||
    code === 'auth/invalid-email'
  ) {
    return 'E-mail ou senha incorretos.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
  }
  if (code === 'auth/user-disabled') return 'Esta conta está desativada.';
  if (code === 'auth/network-request-failed') {
    return 'Não foi possível conectar ao serviço de autenticação. Verifique sua conexão e tente novamente.';
  }
  return 'Não foi possível entrar. Tente novamente.';
}
