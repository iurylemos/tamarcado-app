import { onAuthStateChanged } from 'firebase/auth';
import { useCallback, useEffect, useMemo, useRef, useState, type JSX, type ReactNode } from 'react';
import type { AuthContextValue, AuthSession } from '../../interfaces/auth.interface';
import { signInWithEmail, signOutCurrentUser } from '../../services/auth.service';
import { auth } from '../../config/firebase.config';
import { AuthContext } from './auth.context';

const initialSession: AuthSession = {
  user: null,
  tenantId: null,
  professionalId: null,
  loading: true,
  error: '',
};

type AuthProviderProps = { children: ReactNode };

export default function AuthProvider({ children }: Readonly<AuthProviderProps>): JSX.Element {
  const [session, setSession] = useState<AuthSession>(initialSession);
  const eventId = useRef<number>(0);

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
        .getIdTokenResult(true)
        .then(async ({ claims }) => {
          if (currentEvent !== eventId.current) return;
          if (
            claims.role !== 'collaborator' ||
            claims.active !== true ||
            typeof claims.tenantId !== 'string'
          ) {
            await signOutCurrentUser();
            if (!auth.currentUser) {
              setSession({
                ...initialSession,
                loading: false,
                error: 'Esta conta não tem acesso à área de colaboradores.',
              });
            }
            return;
          }
          setSession({
            user,
            tenantId: claims.tenantId,
            professionalId:
              typeof claims.professionalId === 'string' ? claims.professionalId : null,
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

  const login = useCallback(
    (email: string, password: string) => signInWithEmail(email, password),
    [],
  );

  const logout = useCallback(() => signOutCurrentUser(), []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...session, login, logout }),
    [session, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
