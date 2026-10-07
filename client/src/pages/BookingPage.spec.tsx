import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppointment } from '../services/appointment.service';
import { listAvailability } from '../services/availability.service';
import { getCompanyCatalog } from '../services/catalog.service';
import { addDaysToDate, getNextBookableDate } from '../utils/date.util';
import BookingPage from './BookingPage';
import { renderWithQueryClient } from '../test/render';

vi.mock('../services/availability.service', () => ({ listAvailability: vi.fn() }));
vi.mock('../services/catalog.service', () => ({ getCompanyCatalog: vi.fn() }));
vi.mock('../services/appointment.service', () => ({ createAppointment: vi.fn() }));

afterEach(cleanup);

describe('BookingPage professional selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCompanyCatalog).mockResolvedValue({
      business: {
        id: 'tenant-aurora',
        name: 'Studio Aurora',
        slug: 'studio-aurora',
        segment: 'beauty',
      },
      products: [
        {
          id: 'service-corte',
          name: 'Corte',
          imageUrl: '/corte.jpg',
          priceCents: 12000,
          durationMinutes: 120,
        },
      ],
    });
  });

  it('shows complete appointment ranges through the end of a two-hour service day', async () => {
    vi.mocked(listAvailability).mockResolvedValue([
      {
        startsAt: '2030-02-04T12:00:00.000Z',
        endsAt: '2030-02-04T14:00:00.000Z',
        professionalId: 'ana',
        professionalName: 'Ana Souza',
      },
      {
        startsAt: '2030-02-04T20:20:00.000Z',
        endsAt: '2030-02-04T22:20:00.000Z',
        professionalId: 'ana',
        professionalName: 'Ana Souza',
      },
    ]);

    renderWithQueryClient(
      <MemoryRouter initialEntries={['/empresa/studio-aurora/agendar/service-corte']}>
        <Routes>
          <Route path="/empresa/:slug/agendar/:productId" element={<BookingPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByLabelText('Profissional selecionado')).toHaveTextContent('Ana Souza');

    expect(screen.getByRole('radio', { name: '09:00 - 11:00' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '17:20 - 19:20' })).toBeInTheDocument();
  });

  it('shows a booking receipt after the customer submits a request', async () => {
    const bookedSlot = {
      startsAt: '2030-02-04T12:00:00.000Z',
      endsAt: '2030-02-04T14:00:00.000Z',
      professionalId: 'ana',
      professionalName: 'Ana Souza',
    };
    const remainingSlot = {
      startsAt: '2030-02-04T14:00:00.000Z',
      endsAt: '2030-02-04T16:00:00.000Z',
      professionalId: 'ana',
      professionalName: 'Ana Souza',
    };
    vi.mocked(listAvailability)
      .mockResolvedValueOnce([bookedSlot, remainingSlot])
      .mockResolvedValueOnce([remainingSlot]);
    vi.mocked(createAppointment).mockResolvedValue({
      appointmentId: 'appointment-12345678',
      status: 'pending',
    });

    renderWithQueryClient(
      <MemoryRouter initialEntries={['/empresa/studio-aurora/agendar/service-corte']}>
        <Routes>
          <Route path="/empresa/:slug/agendar/:productId" element={<BookingPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('radio', { name: '09:00 - 11:00' }));
    fireEvent.change(screen.getByLabelText('Seu nome'), {
      target: { value: 'Maria Silva' },
    });
    fireEvent.change(screen.getByLabelText(/Celular com DDD/i), {
      target: { value: '(11) 99999-0000' },
    });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar agendamento' }));

    expect(await screen.findByRole('dialog')).toHaveTextContent('Solicitação enviada!');
    expect(screen.getByRole('dialog')).toHaveTextContent('09:00 - 11:00');
    expect(screen.getByRole('dialog')).toHaveTextContent('appointment-12345678');
    expect(screen.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute(
      'href',
      expect.stringContaining('https://wa.me/?text='),
    );
    expect(screen.getByRole('link', { name: 'E-mail' })).toHaveAttribute(
      'href',
      expect.stringContaining('https://mail.google.com/mail/'),
    );
    await waitFor(() =>
      expect(createAppointment).toHaveBeenCalledWith(
        expect.objectContaining({ whatsappOptIn: true }),
      ),
    );
    await waitFor(() => expect(listAvailability).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('radio', { name: '11:00 - 13:00' })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: '09:00 - 11:00' })).not.toBeInTheDocument();
  });

  it('shows a customer-friendly message when the booking request fails internally', async () => {
    vi.mocked(listAvailability).mockResolvedValue([
      {
        startsAt: '2030-02-04T12:00:00.000Z',
        endsAt: '2030-02-04T14:00:00.000Z',
        professionalId: 'ana',
        professionalName: 'Ana Souza',
      },
    ]);
    vi.mocked(createAppointment).mockRejectedValue(
      Object.assign(new Error('INTERNAL'), { code: 'functions/internal' }),
    );

    renderWithQueryClient(
      <MemoryRouter initialEntries={['/empresa/studio-aurora/agendar/service-corte']}>
        <Routes>
          <Route path="/empresa/:slug/agendar/:productId" element={<BookingPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('radio', { name: '09:00 - 11:00' }));
    fireEvent.change(screen.getByLabelText('Seu nome'), {
      target: { value: 'Maria Silva' },
    });
    fireEvent.change(screen.getByLabelText(/Celular com DDD/i), {
      target: { value: '(11) 99999-0000' },
    });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar agendamento' }));

    expect(
      await screen.findByText(
        'Não foi possível enviar sua solicitação de agendamento agora. Tente novamente em instantes.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('INTERNAL')).not.toBeInTheDocument();
  });

  it('offers only eligible choices if multiple professionals can perform the service', async () => {
    vi.mocked(listAvailability).mockResolvedValue([
      {
        startsAt: '2030-02-04T12:00:00.000Z',
        endsAt: '2030-02-04T13:00:00.000Z',
        professionalId: 'ana',
        professionalName: 'Ana Souza',
      },
      {
        startsAt: '2030-02-04T13:00:00.000Z',
        endsAt: '2030-02-04T14:00:00.000Z',
        professionalId: 'bruna',
        professionalName: 'Bruna Lima',
      },
    ]);
    renderWithQueryClient(
      <MemoryRouter initialEntries={['/empresa/studio-aurora/agendar/service-corte']}>
        <Routes>
          <Route path="/empresa/:slug/agendar/:productId" element={<BookingPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByLabelText('Profissional')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Ana Souza' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Bruna Lima' })).toBeInTheDocument();
    expect(screen.getByLabelText('Profissional')).toHaveValue('ana');
  });

  it('shows an empty eligibility state when no professional can serve the selected service', async () => {
    vi.mocked(listAvailability).mockResolvedValue([]);
    renderWithQueryClient(
      <MemoryRouter initialEntries={['/empresa/studio-aurora/agendar/service-corte']}>
        <Routes>
          <Route path="/empresa/:slug/agendar/:productId" element={<BookingPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(
      await screen.findByText('Não há profissionais disponíveis para este serviço.'),
    ).toBeInTheDocument();
  });

  it('suggests the next date with available hours when the selected date is empty', async () => {
    const nextAvailableDate = addDaysToDate(getNextBookableDate(), 3);
    vi.mocked(listAvailability).mockImplementation(async ({ date }) =>
      date === nextAvailableDate
        ? [
            {
              startsAt: '2030-02-07T12:00:00.000Z',
              endsAt: '2030-02-07T14:00:00.000Z',
              professionalId: 'ana',
              professionalName: 'Ana Souza',
            },
          ]
        : [],
    );

    renderWithQueryClient(
      <MemoryRouter initialEntries={['/empresa/studio-aurora/agendar/service-corte']}>
        <Routes>
          <Route path="/empresa/:slug/agendar/:productId" element={<BookingPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('button', { name: 'Ver horários' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver horários' }));
    expect(await screen.findByRole('radio', { name: '09:00 - 11:00' })).toBeInTheDocument();
  });
});
