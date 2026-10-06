import { beforeEach, describe, expect, it, vi } from 'vitest';
import { httpsCallable } from 'firebase/functions';
import { listAppointments } from './appointment.service';

const mocks = vi.hoisted(() => ({
  callable: vi.fn(),
  functions: {},
}));

vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(() => mocks.callable),
}));

vi.mock('../config/firebase.config', () => ({
  auth: { currentUser: null },
  db: {},
  functions: mocks.functions,
}));

describe('listAppointments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.callable.mockResolvedValue({
      data: { appointments: [], timezone: 'America/Sao_Paulo' },
    });
  });

  it('sends an empty filters object when no filters are provided', async () => {
    await listAppointments();

    expect(httpsCallable).toHaveBeenCalledWith(mocks.functions, 'listAppointments');
    expect(mocks.callable).toHaveBeenCalledWith({});
  });

  it('sends the selected filters to the callable', async () => {
    const filters = { date: '2026-10-05' };

    await listAppointments(filters);

    expect(mocks.callable).toHaveBeenCalledWith(filters);
  });
});
