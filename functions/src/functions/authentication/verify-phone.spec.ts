import { describe, expect, it, vi } from 'vitest';
import {
  createPhoneVerificationService,
  type PhoneVerificationChallenge,
  type PhoneVerificationStore,
} from '../../services/phone-verification.service';
import type { WhatsAppVerificationProvider } from '../../services/whatsapp-verification.provider';

function createHarness() {
  const challenges = new Map<string, PhoneVerificationChallenge>();
  let now = 1_800_000_000_000;
  let startCount = 0;
  const sendCode = vi.fn<WhatsAppVerificationProvider['sendCode']>();
  const reserveChallenge = vi.fn<PhoneVerificationStore['reserveChallenge']>(
    async (id, challenge) => {
      if (startCount >= 3) return false;
      startCount += 1;
      challenges.set(id, challenge);
      return true;
    },
  );
  const verifyAndConsume = vi.fn<PhoneVerificationStore['verifyAndConsume']>(
    async ({ id, phoneHash, role, codeHash, now: timestamp }) => {
      const challenge = challenges.get(id);
      if (!challenge || challenge.phoneHash !== phoneHash || challenge.role !== role)
        return 'missing';
      if (challenge.consumedAt !== undefined) return 'replayed';
      if (timestamp >= challenge.expiresAt) return 'expired';
      if (challenge.attempts >= 5) return 'rate-limited';
      if (challenge.codeHash !== codeHash) {
        challenge.attempts += 1;
        return challenge.attempts >= 5 ? 'rate-limited' : 'invalid';
      }
      challenge.consumedAt = timestamp;
      return 'verified';
    },
  );
  const store: PhoneVerificationStore = { reserveChallenge, verifyAndConsume };
  const provider: WhatsAppVerificationProvider = { sendCode };
  const service = createPhoneVerificationService({
    store,
    provider,
    now: () => now,
    createChallengeId: () => 'challenge-1',
    createCode: () => '123456',
  });

  return {
    service,
    sendCode,
    reserveChallenge,
    verifyAndConsume,
    advanceTime: (milliseconds: number) => {
      now += milliseconds;
    },
  };
}

describe('phone verification challenges', () => {
  it('normalizes Brazilian numbers and sends a one-time code through the provider', async () => {
    const { service, sendCode, reserveChallenge } = createHarness();

    const challengeId = await service.start('(11) 99999-0001', 'collaborator');

    expect(challengeId).toBe('challenge-1');
    expect(sendCode).toHaveBeenCalledWith('+5511999990001', '123456');
    expect(reserveChallenge).toHaveBeenCalledWith(
      'challenge-1',
      expect.objectContaining({
        phoneHash: expect.any(String),
        role: 'collaborator',
        codeHash: expect.any(String),
        expiresAt: 1_800_000_300_000,
      }),
    );
  });

  it('rejects invalid codes and locks a challenge after five attempts', async () => {
    const { service } = createHarness();
    await service.start('+5511999990001', 'collaborator');

    for (let attempt = 0; attempt < 4; attempt += 1) {
      await expect(
        service.verify('+5511999990001', 'collaborator', 'challenge-1', '000000'),
      ).rejects.toMatchObject({ code: 'invalid-argument' });
    }
    await expect(
      service.verify('+5511999990001', 'collaborator', 'challenge-1', '000000'),
    ).rejects.toMatchObject({ code: 'resource-exhausted' });
  });

  it('rejects expired and replayed challenges', async () => {
    const expired = createHarness();
    await expired.service.start('+5511999990001', 'collaborator');
    expired.advanceTime(5 * 60_000);
    await expect(
      expired.service.verify('+5511999990001', 'collaborator', 'challenge-1', '123456'),
    ).rejects.toMatchObject({ code: 'deadline-exceeded' });

    const replayed = createHarness();
    await replayed.service.start('+5511999990001', 'collaborator');
    await replayed.service.verify('+5511999990001', 'collaborator', 'challenge-1', '123456');
    await expect(
      replayed.service.verify('+5511999990001', 'collaborator', 'challenge-1', '123456'),
    ).rejects.toMatchObject({ code: 'failed-precondition' });
  });

  it('rate-limits repeated challenge requests for one phone', async () => {
    const { service } = createHarness();
    await service.start('+5511999990001', 'collaborator');
    await service.start('+5511999990001', 'collaborator');
    await service.start('+5511999990001', 'collaborator');
    await expect(service.start('+5511999990001', 'collaborator')).rejects.toMatchObject({
      code: 'resource-exhausted',
    });
  });

  it('rejects malformed phones and codes before verification', async () => {
    const { service, verifyAndConsume } = createHarness();

    await expect(service.start('12345', 'backoffice')).rejects.toMatchObject({
      code: 'invalid-argument',
    });
    await expect(service.verify('+5511999990001', 'backoffice', '', '12')).rejects.toMatchObject({
      code: 'invalid-argument',
    });
    expect(verifyAndConsume).not.toHaveBeenCalled();
  });
});
