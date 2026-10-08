import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppointment } from '../services/appointment.service';
import { listAvailability } from '../services/availability.service';
import { getCompanyCatalog } from '../services/catalog.service';
import CompanyCatalogPage from './CompanyCatalogPage';
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
    vi.stubGlobal('scrollTo', vi.fn());
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:company-manifest'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
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

  it('shows booking detail and time-card skeletons while requests are pending', async () => {
    vi.mocked(listAvailability).mockReturnValue(new Promise(() => undefined));

    const { container } = renderWithQueryClient(
      <MemoryRouter initialEntries={['/empresa/studio-aurora/agendar/service-corte']}>
        <Routes>
          <Route path="/empresa/:slug/agendar/:productId" element={<BookingPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Corte' })).toBeInTheDocument();
    expect(screen.getByText('RESUMO DO SERVIÇO')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Quando você quer vir?' })).toBeInTheDocument();
    expect(screen.getByText('Buscando horários disponíveis...')).toBeInTheDocument();
    expect(screen.getByText('Buscando horários disponíveis...')).toHaveClass('skeleton-status');
    expect(container.querySelectorAll('.skeleton-card')).toHaveLength(4);
  });

  it('keeps static booking content visible while catalog-backed summary data loads', () => {
    vi.mocked(getCompanyCatalog).mockReturnValue(new Promise(() => undefined));

    const { container } = renderWithQueryClient(
      <MemoryRouter initialEntries={['/empresa/studio-aurora/agendar/service-corte']}>
        <Routes>
          <Route path="/empresa/:slug/agendar/:productId" element={<BookingPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: '← Voltar ao catálogo' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Seu próximo momento começa aqui.' }),
    ).toBeInTheDocument();
    expect(screen.getByText('RESUMO DO SERVIÇO')).toBeInTheDocument();
    expect(container.querySelector('.booking-summary-loading')).toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(screen.getByLabelText('Data do atendimento')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Quando você quer vir?' })).toBeInTheDocument();
    expect(screen.getByText('Preparando horários disponíveis...')).toBeInTheDocument();
    expect(container.querySelectorAll('.skeleton-card--booking')).toHaveLength(0);
    expect(container.querySelectorAll('.skeleton-card--time')).toHaveLength(4);
  });

  it('offers an actionable catalog link when business validation fails', async () => {
    vi.mocked(getCompanyCatalog).mockRejectedValue(new Error('network error'));

    renderWithQueryClient(
      <MemoryRouter initialEntries={['/empresa/studio-aurora/agendar/service-corte']}>
        <Routes>
          <Route path="/empresa/:slug/agendar/:productId" element={<BookingPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar os dados do serviço.',
    );
    expect(screen.getByRole('link', { name: 'Voltar ao catálogo' })).toHaveAttribute(
      'href',
      '/empresa/studio-aurora',
    );
  });

  it('revalidates the business catalog before loading availability', async () => {
    vi.mocked(listAvailability).mockResolvedValue([
      {
        startsAt: '2030-02-04T12:00:00.000Z',
        endsAt: '2030-02-04T14:00:00.000Z',
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

    await waitFor(() => expect(listAvailability).toHaveBeenCalled());
    expect(getCompanyCatalog).toHaveBeenCalledTimes(2);
    expect(listAvailability).toHaveBeenCalledWith(
      expect.objectContaining({ businessSlug: 'studio-aurora', productId: 'service-corte' }),
    );
  });

  it('does not load availability if the service is no longer in the business catalog', async () => {
    const catalog = vi.mocked(getCompanyCatalog);
    catalog
      .mockResolvedValueOnce({
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
      })
      .mockResolvedValueOnce({
        business: {
          id: 'tenant-aurora',
          name: 'Studio Aurora',
          slug: 'studio-aurora',
          segment: 'beauty',
        },
        products: [],
      });

    renderWithQueryClient(
      <MemoryRouter initialEntries={['/empresa/studio-aurora/agendar/service-corte']}>
        <Routes>
          <Route path="/empresa/:slug/agendar/:productId" element={<BookingPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Serviço não encontrado.')).toBeInTheDocument();
    expect(getCompanyCatalog).toHaveBeenCalledTimes(2);
    expect(listAvailability).not.toHaveBeenCalled();
  });

  it('does not submit when the service disappears from the latest business catalog', async () => {
    const catalog = {
      business: {
        id: 'tenant-aurora',
        name: 'Studio Aurora',
        slug: 'studio-aurora',
        segment: 'beauty' as const,
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
    };
    vi.mocked(getCompanyCatalog)
      .mockReset()
      .mockResolvedValueOnce(catalog)
      .mockResolvedValueOnce(catalog)
      .mockResolvedValueOnce({ ...catalog, products: [] });
    vi.mocked(listAvailability).mockResolvedValue([
      {
        startsAt: '2030-02-04T12:00:00.000Z',
        endsAt: '2030-02-04T14:00:00.000Z',
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

    fireEvent.click(await screen.findByRole('radio', { name: '09:00 - 11:00' }));
    fireEvent.change(screen.getByLabelText('Seu nome'), {
      target: { value: 'Maria Silva' },
    });
    fireEvent.change(screen.getByLabelText(/Celular com DDD/i), {
      target: { value: '(11) 99999-0000' },
    });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar agendamento' }));

    expect(await screen.findByText('Serviço não encontrado.')).toBeInTheDocument();
    expect(getCompanyCatalog).toHaveBeenCalledTimes(3);
    expect(createAppointment).not.toHaveBeenCalled();
  });

  it('shows time skeletons instead of visible progress copy while searching for a later date', async () => {
    vi.mocked(listAvailability)
      .mockResolvedValueOnce([])
      .mockReturnValue(new Promise(() => undefined));

    const { container } = renderWithQueryClient(
      <MemoryRouter initialEntries={['/empresa/studio-aurora/agendar/service-corte']}>
        <Routes>
          <Route path="/empresa/:slug/agendar/:productId" element={<BookingPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const searchingMessage = await screen.findByText('Procurando o próximo dia com horários...');
    expect(searchingMessage).toHaveClass('skeleton-status');
    expect(container.querySelectorAll('.skeleton-card--time')).toHaveLength(2);
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

    const { container } = renderWithQueryClient(
      <MemoryRouter initialEntries={['/empresa/studio-aurora/agendar/service-corte']}>
        <Routes>
          <Route path="/empresa/:slug/agendar/:productId" element={<BookingPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByLabelText('Profissional selecionado')).toHaveTextContent('Ana Souza');

    expect(screen.getByRole('radio', { name: '09:00 - 11:00' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '17:20 - 19:20' })).toBeInTheDocument();
    expect(container.querySelector('.skeleton-card')).not.toBeInTheDocument();
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
        expect.objectContaining({
          businessSlug: 'studio-aurora',
          productId: 'service-corte',
          whatsappOptIn: true,
        }),
      ),
    );
    await waitFor(() => expect(listAvailability).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('radio', { name: '11:00 - 13:00' })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: '09:00 - 11:00' })).not.toBeInTheDocument();
  });

  it('scrolls the customer details into view once after selecting a time without focusing it', async () => {
    vi.mocked(listAvailability).mockResolvedValue([
      {
        startsAt: '2030-02-04T12:00:00.000Z',
        endsAt: '2030-02-04T14:00:00.000Z',
        professionalId: 'ana',
        professionalName: 'Ana Souza',
      },
      {
        startsAt: '2030-02-04T13:00:00.000Z',
        endsAt: '2030-02-04T15:00:00.000Z',
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

    const scrollSpy = vi.mocked(HTMLElement.prototype.scrollIntoView);
    fireEvent.click(await screen.findByRole('radio', { name: '09:00 - 11:00' }));

    await waitFor(() => expect(scrollSpy).toHaveBeenCalledOnce());
    expect(document.activeElement).toBe(document.body);
    expect(screen.getByText('2. SEUS DADOS')).toBeInTheDocument();
    expect(screen.getByLabelText('Seu nome')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: '10:00 - 12:00' }));
    expect(scrollSpy).toHaveBeenCalledOnce();
  });

  it('uses immediate scrolling when reduced motion is preferred', async () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
    vi.mocked(listAvailability).mockResolvedValue([
      {
        startsAt: '2030-02-04T12:00:00.000Z',
        endsAt: '2030-02-04T14:00:00.000Z',
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

    const scrollSpy = vi.mocked(HTMLElement.prototype.scrollIntoView);
    fireEvent.click(await screen.findByRole('radio', { name: '09:00 - 11:00' }));

    await waitFor(() =>
      expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'auto', block: 'center' }),
    );
    expect(document.activeElement).toBe(document.body);
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
    const { container } = renderWithQueryClient(
      <MemoryRouter initialEntries={['/empresa/studio-aurora/agendar/service-corte']}>
        <Routes>
          <Route path="/empresa/:slug/agendar/:productId" element={<BookingPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(
      await screen.findByText('Não há profissionais disponíveis para este serviço.'),
    ).toBeInTheDocument();
    expect(container.querySelector('.skeleton-card')).not.toBeInTheDocument();
  });

  it('shows the availability error after removing loading skeletons', async () => {
    vi.mocked(listAvailability).mockRejectedValue(new Error('network error'));

    const { container } = renderWithQueryClient(
      <MemoryRouter initialEntries={['/empresa/studio-aurora/agendar/service-corte']}>
        <Routes>
          <Route path="/empresa/:slug/agendar/:productId" element={<BookingPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('network error')).toBeInTheDocument();
    expect(container.querySelector('.skeleton-card')).not.toBeInTheDocument();
  });

  it('automatically selects the nearest date with available hours when the selected date is empty', async () => {
    const nextAvailableDate = addDaysToDate(getNextBookableDate(), 3);
    vi.mocked(listAvailability).mockImplementation(async ({ date }) =>
      date === nextAvailableDate
        ? [
            {
              startsAt: `${nextAvailableDate}T12:00:00.000Z`,
              endsAt: `${nextAvailableDate}T14:00:00.000Z`,
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

    await waitFor(() =>
      expect(screen.getByLabelText('Data do atendimento')).toHaveValue(nextAvailableDate),
    );
    expect(await screen.findByRole('radio', { name: '09:00 - 11:00' })).toBeInTheDocument();
  });

  it('shows clear guidance when no times are available in the 30-day search range', async () => {
    vi.mocked(listAvailability).mockResolvedValue([]);

    renderWithQueryClient(
      <MemoryRouter initialEntries={['/empresa/studio-aurora/agendar/service-corte']}>
        <Routes>
          <Route path="/empresa/:slug/agendar/:productId" element={<BookingPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByText('Não encontramos horários nos próximos 30 dias. Escolha outra data.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Data do atendimento')).toBeInTheDocument();
  });

  it('ignores availability results for a date that is no longer selected', async () => {
    const selectedDate = addDaysToDate(getNextBookableDate(), 2);
    const results = new Map<
      string,
      (value: Awaited<ReturnType<typeof listAvailability>>) => void
    >();
    vi.mocked(listAvailability).mockImplementation(
      ({ date }) =>
        new Promise((resolve) => {
          results.set(date, resolve);
        }),
    );

    renderWithQueryClient(
      <MemoryRouter initialEntries={['/empresa/studio-aurora/agendar/service-corte']}>
        <Routes>
          <Route path="/empresa/:slug/agendar/:productId" element={<BookingPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByLabelText('Data do atendimento');
    const oldDate = getNextBookableDate();
    await waitFor(() =>
      expect(listAvailability).toHaveBeenCalledWith(expect.objectContaining({ date: oldDate })),
    );
    const dateInput = screen.getByLabelText('Data do atendimento');
    fireEvent.change(dateInput, { target: { value: selectedDate } });
    await waitFor(() => expect(results.has(oldDate) && results.has(selectedDate)).toBe(true));

    results.get(oldDate)?.([
      {
        startsAt: '2030-02-04T12:00:00.000Z',
        endsAt: '2030-02-04T14:00:00.000Z',
        professionalId: 'ana',
        professionalName: 'Ana Souza',
      },
    ]);
    results.get(selectedDate)?.([
      {
        startsAt: '2030-02-06T12:00:00.000Z',
        endsAt: '2030-02-06T14:00:00.000Z',
        professionalId: 'ana',
        professionalName: 'Ana Souza',
      },
    ]);

    expect(await screen.findByRole('radio', { name: '09:00 - 11:00' })).toBeInTheDocument();
    expect(dateInput).toHaveValue(selectedDate);
    expect(listAvailability).toHaveBeenCalledWith(expect.objectContaining({ date: selectedDate }));
  });

  it('returns to the matching catalog after one activation', async () => {
    vi.mocked(listAvailability).mockResolvedValue([]);

    renderWithQueryClient(
      <MemoryRouter initialEntries={['/empresa/studio-aurora/agendar/service-corte']}>
        <Routes>
          <Route path="/empresa/:slug/agendar/:productId" element={<BookingPage />} />
          <Route path="/empresa/:slug" element={<CompanyCatalogPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Corte' })).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('link', { name: /Voltar ao catálogo/ }));
    expect(await screen.findByRole('heading', { name: 'Studio Aurora' })).toBeInTheDocument();
  });
});
