import type { User } from 'firebase/auth';

export interface AuthSession {
  user: User | null;
  tenantId: string | null;
  loading: boolean;
  error: string;
}

export interface AuthContextValue extends AuthSession {
  requestCode(phone: string): Promise<string>;
  verifyCode(challengeId: string, phone: string, code: string): Promise<void>;
  logout(): Promise<void>;
}
