import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listAvailability } from '../services/availability.service';
import { getCompanyCatalog } from '../services/catalog.service';
import BookingPage from './BookingPage';

vi.mock('../services/availability.service', () => ({ listAvailability: vi.fn() }));
vi.mock('../services/catalog.service', () => ({ getCompanyCatalog: vi.fn() }));
vi.mock('../services/appointment.service', () => ({ createAppointment: vi.fn() }));

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
          durationMinutes: 60,
        },
      ],
    });
  });

  it('selects the only eligible professional automatically', async () => {
    vi.mocked(listAvailability).mockResolvedValue([
      {
        startsAt: '2030-02-04T12:00:00.000Z',
        endsAt: '2030-02-04T13:00:00.000Z',
        professionalId: 'ana',
        professionalName: 'Ana Souza',
      },
    ]);

    render(
      <MemoryRouter initialEntries={['/empresa/studio-aurora/agendar/service-corte']}>
        <Routes>
          <Route path="/empresa/:slug/agendar/:productId" element={<BookingPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByLabelText('Profissional selecionado')).toHaveTextContent('Ana Souza');

    expect(screen.getByRole('radio', { name: /09:00/ })).toBeInTheDocument();
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
    render(
      <MemoryRouter initialEntries={['/empresa/studio-aurora/agendar/service-corte']}>
        <Routes>
          <Route path="/empresa/:slug/agendar/:productId" element={<BookingPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByLabelText('Profissional')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Ana Souza' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Bruna Lima' })).toBeInTheDocument();
  });

  it('shows an empty eligibility state when no professional can serve the selected service', async () => {
    vi.mocked(listAvailability).mockResolvedValue([]);
    render(
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
});
