import type { UserDocument } from '../model/user.model';
import { WhatsAppVerificationProvider } from '../services/whatsapp-verification.provider';

export interface PhoneVerificationChallenge {
  phoneHash: string;
  role: UserDocument['role'];
  codeHash: string;
  createdAt: number;
  expiresAt: number;
  attempts: number;
  consumedAt?: number;
}

export type ChallengeVerificationResult =
  'verified' | 'invalid' | 'expired' | 'replayed' | 'rate-limited' | 'missing';

export interface PhoneVerificationStore {
  reserveChallenge(id: string, challenge: PhoneVerificationChallenge): Promise<boolean>;
  verifyAndConsume(input: {
    id: string;
    phoneHash: string;
    role: UserDocument['role'];
    codeHash: string;
    now: number;
  }): Promise<ChallengeVerificationResult>;
}

export interface PhoneVerificationServiceDependencies {
  store: PhoneVerificationStore;
  provider: WhatsAppVerificationProvider;
  now?: () => number;
  createChallengeId?: () => string;
  createCode?: () => string;
}
