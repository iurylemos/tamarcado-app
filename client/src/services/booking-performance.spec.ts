import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppointment } from './appointment.service';
import { searchAvailability } from './availability.service';

const httpsCallable = vi.hoisted(() => vi.fn());

vi.mock('firebase/functions', () => ({ httpsCallable }));
vi.mock('../config/firebase.config', () => ({ functions: {} }));

describe('booking service timing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    expect(JSON.stringify(info.mock.calls)).not.toMatch(/Maria Silva|11999990000|mensagem/i);
  });
});
