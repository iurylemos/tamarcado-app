import { describe, expect, it } from 'vitest';
import { getBookingErrorMessage } from './booking-error.util';

describe('getBookingErrorMessage', () => {
  const fallback = 'Não foi possível enviar sua solicitação agora. Tente novamente.';

  it.each([
    new Error('INTERNAL'),
    { code: 'functions/internal', message: 'INTERNAL' },
    { error: { message: 'INTERNAL', status: 'INTERNAL' } },
    { message: 'INTERNAL[0]' },
    {
      message: '{"error":{"message":"INTERNAL","status":"INTERNAL"}}',
    },
  ])('uses a friendly fallback for internal errors', (error) => {
    expect(getBookingErrorMessage(error, fallback)).toBe(fallback);
  });

  it('keeps a descriptive server validation message', () => {
    expect(
      getBookingErrorMessage(
        { code: 'functions/failed-precondition', message: 'Este horário não está disponível.' },
        fallback,
      ),
    ).toBe('Este horário não está disponível.');
  });

  it('uses the fallback for unknown error shapes', () => {
    expect(getBookingErrorMessage(undefined, fallback)).toBe(fallback);
  });
});
