import { createHash, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { HttpsError } from 'firebase-functions/v2/https';
import { collections } from '../config/collections';
import { firestore } from './firestore.service';
import type { UserDocument } from '../model/user.model';
import { whatsappVerificationProvider } from './whatsapp-verification.provider';
import type {
  PhoneVerificationChallenge,
  PhoneVerificationServiceDependencies,
  PhoneVerificationStore,
} from '../interfaces/phone.interface';

const challengeLifetimeMs = 5 * 60_000;
const rateLimitWindowMs = 60 * 60_000;
const maxChallengesPerWindow = 3;
const maxAttempts = 5;

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function codeHash(code: string, challengeId: string): string {
  return hash(`${challengeId}:${code}`);
}

export function normalizeBrazilianPhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  const nationalNumber = digits.startsWith('55') ? digits.slice(2) : digits;

  if (!/^[1-9]\d(?:[2-9]\d{7}|9\d{8})$/.test(nationalNumber)) {
    throw new HttpsError('invalid-argument', 'Informe um telefone celular válido com DDD.');
  }

  return `+55${nationalNumber}`;
}

function sameHash(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export const firestorePhoneVerificationStore: PhoneVerificationStore = {
  async reserveChallenge(id: string, challenge) {
    const challengeRef = firestore.collection(collections.phoneVerificationChallenges).doc(id);
    const rateRef = firestore
      .collection(collections.phoneVerificationRateLimits)
      .doc(challenge.phoneHash);

    return firestore.runTransaction(async (transaction) => {
      const rateSnapshot = await transaction.get(rateRef);
      const rate = rateSnapshot.data() as
        { windowStartedAt: number; requestCount: number } | undefined;
      const inWindow = rate && challenge.createdAt - rate.windowStartedAt < rateLimitWindowMs;

      if (inWindow && rate.requestCount >= maxChallengesPerWindow) return false;

      transaction.set(challengeRef, challenge);
      transaction.set(rateRef, {
        windowStartedAt: inWindow ? rate.windowStartedAt : challenge.createdAt,
        requestCount: inWindow ? rate.requestCount + 1 : 1,
      });
      return true;
    });
  },

  async verifyAndConsume({ id, phoneHash, role, codeHash: candidateHash, now }) {
    const challengeRef = firestore.collection(collections.phoneVerificationChallenges).doc(id);

    return firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(challengeRef);
      const challenge = snapshot.data() as PhoneVerificationChallenge | undefined;

      if (!challenge || challenge.phoneHash !== phoneHash || challenge.role !== role)
        return 'missing';
      if (challenge.consumedAt !== undefined) return 'replayed';
      if (now >= challenge.expiresAt) return 'expired';
      if (challenge.attempts >= maxAttempts) return 'rate-limited';

      if (!sameHash(challenge.codeHash, candidateHash)) {
        const attempts = challenge.attempts + 1;
        transaction.update(challengeRef, { attempts });
        return attempts >= maxAttempts ? 'rate-limited' : 'invalid';
      }

      transaction.update(challengeRef, { consumedAt: now });
      return 'verified';
    });
  },
};

export function createPhoneVerificationService({
  store,
  provider,
  now = Date.now,
  createChallengeId = randomUUID,
  createCode = () => `${randomInt(100_000, 1_000_000)}`,
}: PhoneVerificationServiceDependencies) {
  return {
    async start(phoneInput: string, role: UserDocument['role']): Promise<string> {
      const phoneE164 = normalizeBrazilianPhone(phoneInput);
      const challengeId = createChallengeId();
      const code = createCode();
      const createdAt = now();
      const reserved = await store.reserveChallenge(challengeId, {
        phoneHash: hash(phoneE164),
        role,
        codeHash: codeHash(code, challengeId),
        createdAt,
        expiresAt: createdAt + challengeLifetimeMs,
        attempts: 0,
      });

      if (!reserved) {
        throw new HttpsError(
          'resource-exhausted',
          'Muitas tentativas. Aguarde antes de solicitar outro código.',
        );
      }

      await provider.sendCode(phoneE164, code);
      return challengeId;
    },

    async verify(
      phoneInput: string,
      role: UserDocument['role'],
      challengeId: string,
      code: string,
    ): Promise<{ phoneE164: string; role: UserDocument['role'] }> {
      const phoneE164 = normalizeBrazilianPhone(phoneInput);
      if (!/^\d{6}$/.test(code) || !challengeId.trim()) {
        throw new HttpsError(
          'invalid-argument',
          'Informe o código de seis dígitos recebido pelo WhatsApp.',
        );
      }

      const result = await store.verifyAndConsume({
        id: challengeId,
        phoneHash: hash(phoneE164),
        role,
        codeHash: codeHash(code, challengeId),
        now: now(),
      });

      if (result === 'invalid') {
        throw new HttpsError('invalid-argument', 'O código informado não é válido.');
      }
      if (result === 'expired') {
        throw new HttpsError('deadline-exceeded', 'O código expirou. Solicite um novo código.');
      }
      if (result === 'replayed') {
        throw new HttpsError(
          'failed-precondition',
          'Este código já foi utilizado. Solicite um novo código.',
        );
      }
      if (result === 'rate-limited') {
        throw new HttpsError(
          'resource-exhausted',
          'Muitas tentativas. Solicite um novo código mais tarde.',
        );
      }
      if (result === 'missing') {
        throw new HttpsError(
          'not-found',
          'Não encontramos uma solicitação válida para este telefone.',
        );
      }

      return { phoneE164, role };
    },
  };
}

export const phoneVerificationService = createPhoneVerificationService({
  store: firestorePhoneVerificationStore,
  provider: whatsappVerificationProvider,
});
