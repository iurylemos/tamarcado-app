import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import type { JSX } from 'react';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppointment } from '../services/appointment.service';
import { listAvailability, searchAvailability } from '../services/availability.service';
import { getCompanyCatalog } from '../services/catalog.service';
import CompanyCatalogPage from './CompanyCatalogPage';
import { addDaysToDate, getNextBookableDate } from '../utils/date.util';
import BookingPage from './BookingPage';
import { renderWithQueryClient } from '../test/render';

function BookingRoutePage(): JSX.Element {
  const { slug = '', productId = '' } = useParams();
  return <BookingPage slug={slug} productId={productId} />;
}

vi.mock('../services/availability.service', () => ({
  listAvailability: vi.fn(),
  searchAvailability: vi.fn(),
}));
vi.mock('../services/catalog.service', () => ({ getCompanyCatalog: vi.fn() }));
vi.mock('../services/appointment.service', () => ({ createAppointment: vi.fn() }));

afterEach(cleanup);

describe('BookingPage professional selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(searchAvailability).mockImplementation(async (input) => {
      const slots = await vi.mocked(listAvailability)(input);
      return { date: slots.length > 0 ? input.date : null, slots };
    });
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
          <Route path="/empresa/:slug/agendar/:productId" element={<BookingRoutePage />} />
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

  it('updates the booking price when the customer selects a different service variation', async () => {
    vi.mocked(getCompanyCatalog).mockResolvedValue({
      business: {
        id: 'tenant-aurora',
        name: 'Studio Aurora',
        slug: 'studio-aurora',
        segment: 'beauty',
      },
      products: [
        {
          id: 'service-cilios',
          name: 'Cílios',
          imageUrl: '/cilios.jpg',
          priceCents: 10000,
          durationMinutes: 120,
          customizationAttributes: [
            {
              id: 'lash-service',
              label: 'Procedimento',
              options: [
                { id: 'lash-lifting', label: 'Lash Lifting' },
                { id: 'volume-brasileiro', label: 'Volume Brasileiro' },
              ],
              defaultOptionId: 'lash-lifting',
            },
          ],
          variantPrices: [
            {
              selections: [{ attributeId: 'lash-service', optionId: 'lash-lifting' }],
              priceCents: 10000,
            },
            {
              selections: [{ attributeId: 'lash-service', optionId: 'volume-brasileiro' }],
              priceCents: 12000,
            },
          ],
        },
      ],
    });
    vi.mocked(listAvailability).mockReturnValue(new Promise(() => undefined));

    const { container } = renderWithQueryClient(
      <MemoryRouter initialEntries={['/empresa/studio-aurora/agendar/service-cilios']}>
        <Routes>
          <Route path="/empresa/:slug/agendar/:productId" element={<BookingRoutePage />} />
        </Routes>
      </MemoryRouter>,
    );

    const procedure = await screen.findByLabelText('Procedimento');
    const summaryDetails = container.querySelector('.booking-summary-details');
    expect(procedure).toHaveValue('lash-lifting');
    expect(summaryDetails?.textContent).toContain('100,00');

    fireEvent.change(procedure, { target: { value: 'volume-brasileiro' } });

    expect(summaryDetails?.textContent).toContain('120,00');
    expect(summaryDetails?.textContent).not.toContain('100,00');
  });

  it('keeps static booking content visible while catalog-backed summary data loads', () => {
    vi.mocked(getCompanyCatalog).mockReturnValue(new Promise(() => undefined));

    const { container } = renderWithQueryClient(
      <MemoryRouter initialEntries={['/empresa/studio-aurora/agendar/service-corte']}>
        <Routes>
          <Route path="/empresa/:slug/agendar/:productId" element={<BookingRoutePage />} />
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
          <Route path="/empresa/:slug/agendar/:productId" element={<BookingRoutePage />} />
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
          <Route path="/empresa/:slug/agendar/:productId" element={<BookingRoutePage />} />
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
          <Route path="/empresa/:slug/agendar/:productId" element={<BookingRoutePage />} />
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
          <Route path="/empresa/:slug/agendar/:productId" element={<BookingRoutePage />} />
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

  it('keeps the search loading state while the bounded availability request is pending', async () => {
    vi.mocked(searchAvailability).mockReturnValue(new Promise(() => undefined));

    const { container } = renderWithQueryClient(
      <MemoryRouter initialEntries={['/empresa/studio-aurora/agendar/service-corte']}>
        <Routes>
          <Route path="/empresa/:slug/agendar/:productId" element={<BookingRoutePage />} />
        </Routes>
      </MemoryRouter>,
    );

    const searchingMessage = await screen.findByText('Buscando horários disponíveis...');
    expect(searchingMessage).toHaveClass('skeleton-status');
    expect(container.querySelectorAll('.skeleton-card--time')).toHaveLength(4);
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
          <Route path="/empresa/:slug/agendar/:productId" element={<BookingRoutePage />} />
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
      .mockReturnValue(new Promise(() => undefined));
    vi.mocked(createAppointment).mockResolvedValue({
      appointmentId: 'appointment-12345678',
      status: 'pending',
    });

    renderWithQueryClient(
      <MemoryRouter initialEntries={['/empresa/studio-aurora/agendar/service-corte']}>
        <Routes>
          <Route path="/empresa/:slug/agendar/:productId" element={<BookingRoutePage />} />
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
    expect(searchAvailability).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Buscando horários disponíveis...')).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '11:00 - 13:00' })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: '09:00 - 11:00' })).not.toBeInTheDocument();
  });

  it('shows no-image state for combinations without a gallery and switches to exact-match galleries', async () => {
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
          imageUrl: '/default.jpg',
          priceCents: 12000,
          durationMinutes: 120,
          customizationAttributes: [
            {
              id: 'color',
              label: 'Cor',
              options: [
                { id: 'natural', label: 'Natural' },
                { id: 'black', label: 'Preto' },
              ],
              defaultOptionId: 'natural',
            },
            {
              id: 'fabric',
              label: 'Tecido',
              options: [
                { id: 'cotton', label: 'Algodão' },
                { id: 'silk', label: 'Seda' },
              ],
              defaultOptionId: 'cotton',
            },
          ],
          defaultImages: [
            { id: 'default-1', storagePath: '', downloadUrl: '/default.jpg' },
            { id: 'default-2', storagePath: '', downloadUrl: '/default-2.jpg' },
          ],
          imageGalleries: [
            {
              id: 'gallery-black-silk',
              productId: 'service-corte',
              combinationKey: 'color:black|fabric:silk',
              selections: [
                { attributeId: 'color', optionId: 'black' },
                { attributeId: 'fabric', optionId: 'silk' },
              ],
              images: [
                { id: 'variant-1', storagePath: '', downloadUrl: '/variant-1.jpg' },
                { id: 'variant-2', storagePath: '', downloadUrl: '/variant-2.jpg' },
              ],
            },
          ],
        },
      ],
    });
    vi.mocked(listAvailability)
      .mockResolvedValueOnce([
        {
          startsAt: '2030-02-04T12:00:00.000Z',
          endsAt: '2030-02-04T14:00:00.000Z',
          professionalId: 'ana',
          professionalName: 'Ana Souza',
        },
      ])
      .mockReturnValue(new Promise(() => undefined));
    vi.mocked(createAppointment).mockResolvedValue({
      appointmentId: 'appointment-customized',
      status: 'pending',
    });

    renderWithQueryClient(
      <MemoryRouter initialEntries={['/empresa/studio-aurora/agendar/service-corte']}>
        <Routes>
          <Route path="/empresa/:slug/agendar/:productId" element={<BookingRoutePage />} />
        </Routes>
      </MemoryRouter>,
    );

    const colorSelect = await screen.findByLabelText('Cor');
    const fabricSelect = screen.getByLabelText('Tecido');
    expect(colorSelect).toHaveValue('natural');
    expect(fabricSelect).toHaveValue('cotton');
    expect(screen.getByText('Imagens não disponíveis para esta combinação.')).toBeInTheDocument();
    expect(document.querySelector('.product-image-gallery__main')).not.toBeInTheDocument();

    fireEvent.change(colorSelect, { target: { value: 'black' } });
    expect(screen.getByText('Imagens não disponíveis para esta combinação.')).toBeInTheDocument();
    fireEvent.change(fabricSelect, { target: { value: 'silk' } });
    expect(
      screen.queryByText('Imagens não disponíveis para esta combinação.'),
    ).not.toBeInTheDocument();
    expect(document.querySelector('.product-image-gallery__main')).toHaveAttribute(
      'src',
      '/variant-1.jpg',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Próxima imagem' }));
    expect(document.querySelector('.product-image-gallery__main')).toHaveAttribute(
      'src',
      '/variant-2.jpg',
    );

    fireEvent.click(await screen.findByRole('radio', { name: /09:00/ }));
    fireEvent.change(screen.getByLabelText('Seu nome'), { target: { value: 'Maria Silva' } });
    fireEvent.change(screen.getByLabelText(/Celular com DDD/i), {
      target: { value: '(11) 99999-0000' },
    });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar agendamento' }));

    await waitFor(() =>
      expect(createAppointment).toHaveBeenCalledWith(
        expect.objectContaining({
          customizationSelections: [
            { attributeId: 'color', optionId: 'black' },
            { attributeId: 'fabric', optionId: 'silk' },
          ],
          selectedImageId: 'variant-2',
        }),
      ),
    );
  });

  it('submits every configured default when the customer leaves the options unchanged', async () => {
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
          imageUrl: '/default.jpg',
          priceCents: 12000,
          durationMinutes: 120,
          customizationAttributes: [
            {
              id: 'color',
              label: 'Cor',
              options: [
                { id: 'natural', label: 'Natural' },
                { id: 'black', label: 'Preto' },
              ],
              defaultOptionId: 'natural',
            },
            {
              id: 'fabric',
              label: 'Tecido',
              options: [
                { id: 'cotton', label: 'Algodão' },
                { id: 'silk', label: 'Seda' },
              ],
              defaultOptionId: 'cotton',
            },
          ],
        },
      ],
    });
    vi.mocked(listAvailability).mockResolvedValue([
      {
        startsAt: '2030-02-04T12:00:00.000Z',
        endsAt: '2030-02-04T14:00:00.000Z',
        professionalId: 'ana',
        professionalName: 'Ana Souza',
      },
    ]);
    vi.mocked(createAppointment).mockResolvedValue({
      appointmentId: 'appointment-default-customizations',
      status: 'pending',
    });

    const { container } = renderWithQueryClient(
      <MemoryRouter initialEntries={['/empresa/studio-aurora/agendar/service-corte']}>
        <Routes>
          <Route path="/empresa/:slug/agendar/:productId" element={<BookingRoutePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByLabelText('Cor')).toHaveValue('natural');
    expect(screen.getByLabelText('Tecido')).toHaveValue('cotton');
    await waitFor(() =>
      expect(container.querySelector('.booking-summary-customizations')).toHaveTextContent(
        'Cor: NaturalTecido: Algodão',
      ),
    );

    fireEvent.click(await screen.findByRole('radio', { name: /09:00/ }));
    fireEvent.change(screen.getByLabelText('Seu nome'), { target: { value: 'Maria Silva' } });
    fireEvent.change(screen.getByLabelText(/Celular com DDD/i), {
      target: { value: '(11) 99999-0000' },
    });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar agendamento' }));

    await waitFor(() =>
      expect(createAppointment).toHaveBeenCalledWith(
        expect.objectContaining({
          customizationSelections: [
            { attributeId: 'color', optionId: 'natural' },
            { attributeId: 'fabric', optionId: 'cotton' },
          ],
        }),
      ),
    );
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
          <Route path="/empresa/:slug/agendar/:productId" element={<BookingRoutePage />} />
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
          <Route path="/empresa/:slug/agendar/:productId" element={<BookingRoutePage />} />
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
          <Route path="/empresa/:slug/agendar/:productId" element={<BookingRoutePage />} />
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
          <Route path="/empresa/:slug/agendar/:productId" element={<BookingRoutePage />} />
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
          <Route path="/empresa/:slug/agendar/:productId" element={<BookingRoutePage />} />
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
          <Route path="/empresa/:slug/agendar/:productId" element={<BookingRoutePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('network error')).toBeInTheDocument();
    expect(container.querySelector('.skeleton-card')).not.toBeInTheDocument();
  });

  it('clears previously displayed slots when a newly selected date search fails', async () => {
    const staleSlot = {
      startsAt: '2030-02-04T12:00:00.000Z',
      endsAt: '2030-02-04T14:00:00.000Z',
      professionalId: 'ana',
      professionalName: 'Ana Souza',
    };
    vi.mocked(searchAvailability)
      .mockResolvedValueOnce({ date: getNextBookableDate(), slots: [staleSlot] })
      .mockRejectedValueOnce(new Error('network error'));

    renderWithQueryClient(
      <MemoryRouter initialEntries={['/empresa/studio-aurora/agendar/service-corte']}>
        <Routes>
          <Route path="/empresa/:slug/agendar/:productId" element={<BookingRoutePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('radio', { name: '09:00 - 11:00' })).toBeInTheDocument();
    const nextDate = addDaysToDate(getNextBookableDate(), 1);
    fireEvent.change(screen.getByLabelText('Data do atendimento'), {
      target: { value: nextDate },
    });

    expect(await screen.findByText('network error')).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: '09:00 - 11:00' })).not.toBeInTheDocument();
  });

  it('automatically selects the nearest date with available hours when the selected date is empty', async () => {
    const nextAvailableDate = addDaysToDate(getNextBookableDate(), 3);
    vi.mocked(searchAvailability).mockResolvedValue({
      date: nextAvailableDate,
      slots: [
        {
          startsAt: `${nextAvailableDate}T12:00:00.000Z`,
          endsAt: `${nextAvailableDate}T14:00:00.000Z`,
          professionalId: 'ana',
          professionalName: 'Ana Souza',
        },
      ],
    });

    renderWithQueryClient(
      <MemoryRouter initialEntries={['/empresa/studio-aurora/agendar/service-corte']}>
        <Routes>
          <Route path="/empresa/:slug/agendar/:productId" element={<BookingRoutePage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(screen.getByLabelText('Data do atendimento')).toHaveValue(nextAvailableDate),
    );
    expect(await screen.findByRole('radio', { name: '09:00 - 11:00' })).toBeInTheDocument();
    expect(searchAvailability).toHaveBeenCalledTimes(1);
    expect(listAvailability).not.toHaveBeenCalled();
  });

  it('shows clear guidance when no times are available in the 30-day search range', async () => {
    vi.mocked(searchAvailability).mockResolvedValue({ date: null, slots: [] });

    renderWithQueryClient(
      <MemoryRouter initialEntries={['/empresa/studio-aurora/agendar/service-corte']}>
        <Routes>
          <Route path="/empresa/:slug/agendar/:productId" element={<BookingRoutePage />} />
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
      (value: Awaited<ReturnType<typeof searchAvailability>>) => void
    >();
    vi.mocked(searchAvailability).mockImplementation(
      ({ date }) =>
        new Promise((resolve) => {
          results.set(date, resolve);
        }),
    );

    renderWithQueryClient(
      <MemoryRouter initialEntries={['/empresa/studio-aurora/agendar/service-corte']}>
        <Routes>
          <Route path="/empresa/:slug/agendar/:productId" element={<BookingRoutePage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByLabelText('Data do atendimento');
    const oldDate = getNextBookableDate();
    await waitFor(() =>
      expect(searchAvailability).toHaveBeenCalledWith(expect.objectContaining({ date: oldDate })),
    );
    const dateInput = screen.getByLabelText('Data do atendimento');
    fireEvent.change(dateInput, { target: { value: selectedDate } });
    await waitFor(() => expect(results.has(oldDate) && results.has(selectedDate)).toBe(true));

    results.get(oldDate)?.({
      date: oldDate,
      slots: [
        {
          startsAt: '2030-02-04T12:00:00.000Z',
          endsAt: '2030-02-04T14:00:00.000Z',
          professionalId: 'ana',
          professionalName: 'Ana Souza',
        },
      ],
    });
    results.get(selectedDate)?.({
      date: selectedDate,
      slots: [
        {
          startsAt: '2030-02-06T12:00:00.000Z',
          endsAt: '2030-02-06T14:00:00.000Z',
          professionalId: 'ana',
          professionalName: 'Ana Souza',
        },
      ],
    });

    expect(await screen.findByRole('radio', { name: '09:00 - 11:00' })).toBeInTheDocument();
    expect(dateInput).toHaveValue(selectedDate);
    expect(searchAvailability).toHaveBeenCalledWith(
      expect.objectContaining({ date: selectedDate }),
    );
  });

  it('links back to the matching catalog', async () => {
    vi.mocked(listAvailability).mockResolvedValue([]);

    renderWithQueryClient(
      <MemoryRouter initialEntries={['/empresa/studio-aurora/agendar/service-corte']}>
        <Routes>
          <Route path="/empresa/:slug/agendar/:productId" element={<BookingRoutePage />} />
          <Route
            path="/empresa/:slug"
            element={<CompanyCatalogPage slug="studio-aurora" />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Corte' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /Voltar ao catálogo/ })).toHaveAttribute(
      'href',
      '/empresa/studio-aurora',
    );
  });
});
