import { onAuthStateChanged } from 'firebase/auth';
import { useCallback, useEffect, useMemo, useRef, useState, type JSX, type ReactNode } from 'react';
import type { AuthSession } from '../../interfaces/auth.interface';
import {
  requestPhoneVerification,
  signInWithPhoneVerification,
  signOutCurrentUser,
} from '../../services/auth.service';
import { auth } from '../../config/firebase.config';
import { AuthContext } from './auth.context';

const initialSession: AuthSession = {
  user: null,
  tenantId: null,
  loading: true,
  error: '',
};

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [session, setSession] = useState<AuthSession>(initialSession);
  const eventId = useRef(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const currentEvent = ++eventId.current;
      if (!user) {
        setSession((previous) => ({
          ...initialSession,
          loading: false,
          error: previous.error,
        }));
        return;
      }

      void user
        .getIdTokenResult()
        .then(async ({ claims }) => {
          if (currentEvent !== eventId.current) return;
          if (
            claims.role !== 'backoffice' ||
            claims.active !== true ||
            typeof claims.tenantId !== 'string'
          ) {
            await signOutCurrentUser();
            if (!auth.currentUser) {
              setSession({
                ...initialSession,
                loading: false,
                error: 'Esta conta não tem acesso ao backoffice.',
              });
            }
            return;
          }
          setSession({
            user,
            tenantId: claims.tenantId,
            loading: false,
            error: '',
          });
        })
        .catch((error: unknown) => {
          if (currentEvent !== eventId.current) return;
          setSession({
            ...initialSession,
            loading: false,
            error: error instanceof Error ? error.message : 'Não foi possível validar sua sessão.',
          });
        });
    });
    return unsubscribe;
  }, []);

  const requestCode = useCallback(
    (phone: string) => requestPhoneVerification(phone, 'backoffice'),
    [],
  );
  const verifyCode = useCallback(
    (challengeId: string, phone: string, code: string) =>
      signInWithPhoneVerification(phone, 'backoffice', challengeId, code),
    [],
  );
  const logout = useCallback(() => signOutCurrentUser(), []);
  const value = useMemo(
    () => ({ ...session, requestCode, verifyCode, logout }),
    [session, requestCode, verifyCode, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
