import type { User } from 'firebase/auth';

export interface AuthSession {
  user: User | null;
  tenantId: string | null;
  loading: boolean;
  error: string;
}

export interface AuthContextValue extends AuthSession {
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
}
