import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CollaboratorAppointment } from '../interfaces/appointment.interface';
import AppointmentsPage from './AppointmentsPage';

const service = vi.hoisted(() => ({
  listAppointments: vi.fn(),
  subscribeToAppointments: vi.fn(),
  updateAppointmentStatus: vi.fn(),
  appointmentLocalDate: (date: Date, timezone: string) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date),
}));

vi.mock('../services/appointment.service', () => service);

const appointments: CollaboratorAppointment[] = [
  {
    id: 'appointment-1',
    tenantId: 'tenant-a',
    customerPhoneE164: '+5511999990001',
    customerName: 'Cliente Um',
    productId: 'service-a',
    professionalId: 'professional-a',
    professionalNameSnapshot: 'Ana',
    startsAt: new Date('2026-10-05T12:00:00.000Z'),
    endsAt: new Date('2026-10-05T13:00:00.000Z'),
    durationMinutes: 60,
    status: 'pending',
    productNameSnapshot: 'Corte',
    productImageUrlSnapshot: 'https://example.test/corte.jpg',
    customizationSnapshot: [
      {
        attributeId: 'color',
        attributeLabel: 'Cor',
        optionId: 'brown',
        optionLabel: 'Castanho',
      },
    ],
    productPriceCentsSnapshot: 12000,
    whatsappOptIn: false,
  },
  {
    id: 'appointment-2',
    tenantId: 'tenant-a',
    customerPhoneE164: '+5511999990002',
    customerName: 'Cliente Dois',
    productId: 'service-a',
    professionalId: 'professional-a',
    professionalNameSnapshot: 'Ana',
    startsAt: new Date('2026-10-06T12:00:00.000Z'),
    endsAt: new Date('2026-10-06T13:00:00.000Z'),
    durationMinutes: 60,
    status: 'confirmed',
    productNameSnapshot: 'Corte',
    productPriceCentsSnapshot: 12000,
    whatsappOptIn: false,
  },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <AppointmentsPage />
    </MemoryRouter>,
  );
}

describe('AppointmentsPage', () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    service.listAppointments.mockResolvedValue({
      appointments,
      timezone: 'America/Sao_Paulo',
    });
    service.subscribeToAppointments.mockResolvedValue(() => undefined);
    service.updateAppointmentStatus.mockResolvedValue(undefined);
  });

  it('shows authorized appointments and only status-appropriate actions', async () => {
    renderPage();
    expect(await screen.findByText('Cliente Um')).toBeInTheDocument();
    expect(screen.getByText('Cliente Dois')).toBeInTheDocument();
    expect(screen.getByText('Castanho').closest('li')).toHaveTextContent('Cor: Castanho');
    expect(screen.queryByText(/Tecido:/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Marcar como concluído' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Reagendar' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Cancelar' })).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() =>
      expect(service.updateAppointmentStatus).toHaveBeenCalledWith('appointment-1', 'confirmed'),
    );
  });

  it('submits the selected date and restores the default view when cleared', async () => {
    renderPage();
    await screen.findByText('Cliente Um');
    fireEvent.change(screen.getByLabelText('Filtrar por data'), {
      target: { value: '2026-10-05' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Filtrar' }));
    await waitFor(() =>
      expect(service.listAppointments).toHaveBeenLastCalledWith({ date: '2026-10-05' }),
    );
    expect(screen.getByText('Cliente Um')).toBeInTheDocument();
    expect(screen.queryByText('Cliente Dois')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Limpar' }));
    await waitFor(() => expect(service.listAppointments).toHaveBeenLastCalledWith({}));
    expect(await screen.findByText('Cliente Dois')).toBeInTheDocument();
  });

  it('shows a clear empty state when the selected date has no appointments', async () => {
    renderPage();
    await screen.findByText('Cliente Um');
    fireEvent.change(screen.getByLabelText('Filtrar por data'), {
      target: { value: '2026-10-10' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Filtrar' }));
    expect(await screen.findByRole('button', { name: 'Limpar filtro' })).toBeInTheDocument();
  });
});
