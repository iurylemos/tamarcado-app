import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppointment } from './appointment.service';
import { searchAvailability } from './availability.service';

const httpsCallable = vi.hoisted(() => vi.fn());
const sentryMocks = vi.hoisted(() => ({
  startSpan: vi.fn(),
  metrics: { distribution: vi.fn() },
}));

vi.mock('firebase/functions', () => ({ httpsCallable }));
vi.mock('../config/firebase.config', () => ({ functions: {} }));
vi.mock('@sentry/react', () => sentryMocks);

describe('booking service timing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sentryMocks.startSpan.mockImplementation((_options, callback) => callback());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs search duration without customer data', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const result = { date: '2030-02-04', slots: [] };
    httpsCallable.mockReturnValue(async () => ({ data: result }));

    await expect(
      searchAvailability({
        businessSlug: 'studio-aurora',
        productId: 'service-corte',
        date: '2030-02-04',
      }),
    ).resolves.toEqual(result);

    expect(info).toHaveBeenCalledWith(
      'booking.performance',
      expect.objectContaining({
        operation: 'availability_search',
        stage: 'client_request',
        durationMs: expect.any(Number),
      }),
    );
    expect(info).toHaveBeenCalledTimes(1);
    expect(sentryMocks.startSpan).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'client.availability_search',
        attributes: { 'app.operation': 'availability_search' },
      }),
      expect.any(Function),
    );
    expect(sentryMocks.metrics.distribution).toHaveBeenCalledWith(
      'client.request.duration',
      expect.any(Number),
      {
        unit: 'millisecond',
        attributes: {
          operation: 'availability_search',
          stage: 'client_request',
        },
      },
    );
    expect(sentryMocks.metrics.distribution).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(info.mock.calls)).not.toMatch(/Maria Silva|11999990000|mensagem/i);
  });

  it('logs appointment duration without customer data', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    httpsCallable.mockReturnValue(async () => ({
      data: { appointmentId: 'appointment-1', status: 'pending' },
    }));

    await expect(
      createAppointment({
        businessSlug: 'studio-aurora',
        productId: 'service-corte',
        professionalId: 'professional-ana',
        startsAt: '2030-02-04T12:00:00.000Z',
        customerName: 'Maria Silva',
        customerPhone: '11999990000',
        whatsappOptIn: true,
      }),
    ).resolves.toMatchObject({ appointmentId: 'appointment-1', status: 'pending' });

    expect(info).toHaveBeenCalledWith(
      'booking.performance',
      expect.objectContaining({
        operation: 'appointment_registration',
        stage: 'client_request',
        durationMs: expect.any(Number),
      }),
    );
    expect(info).toHaveBeenCalledTimes(1);
    expect(sentryMocks.startSpan).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'client.appointment_registration',
        attributes: { 'app.operation': 'appointment_registration' },
      }),
      expect.any(Function),
    );
    expect(sentryMocks.metrics.distribution).toHaveBeenCalledWith(
      'client.request.duration',
      expect.any(Number),
      {
        unit: 'millisecond',
        attributes: {
          operation: 'appointment_registration',
          stage: 'client_request',
        },
      },
    );
    expect(sentryMocks.metrics.distribution).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(info.mock.calls)).not.toMatch(/Maria Silva|11999990000|mensagem/i);
  });

  it('records request latency when the callable fails without logging its error payload', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const failure = new Error('Provider rejected phone 11999990000');
    httpsCallable.mockReturnValue(async () => {
      throw failure;
    });

    await expect(
      searchAvailability({
        businessSlug: 'studio-aurora',
        productId: 'service-corte',
        date: '2030-02-04',
      }),
    ).rejects.toBe(failure);

    expect(info).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledWith(
      'booking.performance',
      expect.objectContaining({
        operation: 'availability_search',
        stage: 'client_request',
        durationMs: expect.any(Number),
      }),
    );
    expect(sentryMocks.metrics.distribution).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(info.mock.calls)).not.toContain('11999990000');
  });
});
