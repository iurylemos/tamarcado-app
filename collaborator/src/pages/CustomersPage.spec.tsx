import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CustomersPage from './CustomersPage';

const service = vi.hoisted(() => ({ listCustomers: vi.fn() }));

vi.mock('../services/customer.service', () => service);

describe('CustomersPage', () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows attendance history, masks phone data, and only links opted-in customers', async () => {
    service.listCustomers.mockResolvedValue({
      timezone: 'America/Sao_Paulo',
      customers: [
        {
          phoneE164: '+5511999990001',
          name: 'Cliente com consentimento',
          completedAttendanceCount: 3,
          latestAttendanceMonth: 9,
          latestAttendanceYear: 2026,
          latestAppointmentAt: '2026-10-05T12:00:00.000Z',
          canContactOnWhatsApp: true,
        },
        {
          phoneE164: '+5511999990002',
          name: 'Cliente sem consentimento',
          completedAttendanceCount: 0,
          latestAppointmentAt: '2026-10-06T12:00:00.000Z',
          canContactOnWhatsApp: false,
        },
      ],
    });

    render(<CustomersPage />);

    expect(await screen.findByText('Cliente com consentimento')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('09/2026')).toBeInTheDocument();
    expect(screen.getByText('**** 0001')).toBeInTheDocument();
    expect(screen.queryByText('+5511999990001')).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Abrir WhatsApp' })).toHaveLength(1);
    expect(screen.getByLabelText('Contato indisponível sem consentimento')).toBeInTheDocument();
  });

  it('shows an empty state when the collaborator has no customers', async () => {
    service.listCustomers.mockResolvedValue({
      timezone: 'America/Sao_Paulo',
      customers: [],
    });
    render(<CustomersPage />);
    expect(await screen.findByText('Nenhum cliente no seu histórico')).toBeInTheDocument();
  });
});
