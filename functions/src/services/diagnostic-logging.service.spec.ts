import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import {
  logProviderDeliveryFailure,
  runCallableWithDiagnostics,
} from './diagnostic-logging.service';

const context = {
  functionName: 'createPublicAppointment' as const,
  operation: 'appointment_booking' as const,
  stage: 'callable' as const,
};

afterEach(() => vi.restoreAllMocks());

describe('diagnostic logging', () => {
  it('logs only allowlisted metadata for an unexpected callable error', async () => {
    const error = new Error('Fake Name fake@example.test Bearer secret-token');
    const errorLog = vi.spyOn(logger, 'error').mockImplementation(() => undefined);

    await expect(
      runCallableWithDiagnostics(context, async () => Promise.reject(error)),
    ).rejects.toMatchObject({
      code: 'internal',
      message: 'INTERNAL',
    });

    expect(errorLog).toHaveBeenCalledOnce();
    expect(errorLog).toHaveBeenCalledWith('operation.unexpected_failure', {
      ...context,
      outcome: 'failure',
      errorCategory: 'unexpected',
    });
    expect(JSON.stringify(errorLog.mock.calls)).not.toMatch(
      /Fake Name|fake@example\.test|secret-token/,
    );
  });

  it('passes expected HttpsError responses through without logging', async () => {
    const expected = new HttpsError('invalid-argument', 'Revise os dados e tente novamente.');
    const errorLog = vi.spyOn(logger, 'error').mockImplementation(() => undefined);

    await expect(
      runCallableWithDiagnostics(context, async () => Promise.reject(expected)),
    ).rejects.toBe(expected);
    expect(errorLog).not.toHaveBeenCalled();
  });

  it('does not let a logger failure change the callable response', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(logger, 'error').mockImplementation(() => {
      throw new Error('logger transport detail');
    });

    await expect(
      runCallableWithDiagnostics(context, async () => Promise.reject(new Error('private input'))),
    ).rejects.toMatchObject({ code: 'internal', message: 'INTERNAL' });
    expect(consoleError).toHaveBeenCalledWith('Structured diagnostic logging failed.');
  });

  it('records provider failures without provider codes or payloads', () => {
    const warning = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    logProviderDeliveryFailure();

    expect(warning).toHaveBeenCalledWith('notification.delivery_failed', {
      functionName: 'processAppointmentNotification',
      operation: 'appointment_notification',
      stage: 'provider_delivery',
      outcome: 'failure',
      errorCategory: 'provider_delivery_failed',
    });
  });
});
