import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { JSX } from 'react';
import { BrowserRouter, Link, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '../config/query-client.config';
import type { PageComponents } from '../interfaces/page.interface';
import CompanyCatalogPage from '../pages/CompanyCatalogPage';
import { getCompanyCatalog } from '../services/catalog.service';
import StorefrontNavigation from './StorefrontNavigation';

vi.mock('../services/catalog.service', () => ({ getCompanyCatalog: vi.fn() }));
vi.mock('../config/firebase.config', () => ({ db: {}, functions: {}, auth: {} }));

function CatalogStart(): JSX.Element {
  return (
    <main>
      <p>Studio Aurora catalog</p>
      <Link to="/empresa/studio-aurora/agendar/service-corte">Book a service</Link>
    </main>
  );
}

function CatalogRoute({ slug }: { slug: string }): JSX.Element {
  return (
    <main>
      <p>{`${slug} catalog`}</p>
      <Link to={`/empresa/${slug}/agendar/service-corte`}>Book a service</Link>
    </main>
  );
}

function BookingRoute({ slug, productId }: { slug: string; productId: string }): JSX.Element {
  return <p>{`Booking ${slug} ${productId}`}</p>;
}

function LocationOutput(): JSX.Element {
  return <output data-testid="current-path">{useLocation().pathname}</output>;
}

afterEach(cleanup);

describe('StorefrontNavigation', () => {
  it('updates and clears the active business theme while navigating between slugs', async () => {
    const businesses = {
      first: {
        id: 'first',
        name: 'First',
        slug: 'first',
        segment: 'beauty' as const,
        primaryColor: '#112233',
        secondaryColor: '#abcdef',
      },
      second: {
        id: 'second',
        name: 'Second',
        slug: 'second',
        segment: 'beauty' as const,
        primaryColor: '#ab1234',
        secondaryColor: '#fedcba',
      },
      default: { id: 'default', name: 'Default', slug: 'default', segment: 'beauty' as const },
    };
    vi.mocked(getCompanyCatalog).mockImplementation(async (slug) => {
      const business = businesses[slug as keyof typeof businesses];
      return business ? { business, products: [] } : null;
    });
    const initialPathname = '/empresa/first';
    window.history.replaceState({}, '', initialPathname);
    const queryClient = createQueryClient();
    const user = userEvent.setup();
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Link to="/empresa/second">Second business</Link>
          <Link to="/empresa/default">Default business</Link>
          <StorefrontNavigation
            initialPathname={initialPathname}
            initialPage={<CompanyCatalogPage slug="first" initialBusiness={businesses.first} />}
            loadPageComponents={async () => ({ catalog: CompanyCatalogPage })}
          />
        </BrowserRouter>
      </QueryClientProvider>,
    );
    expect(container.querySelector('[data-custom-primary]')).toHaveStyle('--color-brand: #112233');

    await user.click(screen.getByRole('link', { name: 'Second business' }));
    await waitFor(() => {
      expect(container.querySelector('[data-custom-primary]')).toHaveStyle(
        '--color-brand: #ab1234',
      );
      expect(container.querySelector('[data-custom-secondary]')).toHaveStyle(
        '--color-promo: #fedcba',
      );
    });
    expect(container.innerHTML).not.toContain('#112233');

    await user.click(screen.getByRole('link', { name: 'Default business' }));
    await screen.findByText('Default');
    expect(container.querySelector('[data-custom-primary]')).toBeNull();
    expect(container.querySelector('[data-custom-secondary]')).toBeNull();
    expect(container.innerHTML).not.toContain('#ab1234');
    queryClient.clear();
  });

  it('navigates with the browser URL and restores routes with back and forward without document navigation', async () => {
    const initialPathname = '/empresa/studio-aurora';
    window.history.replaceState({}, '', initialPathname);
    const loadPageComponents = vi.fn(async (name: string): Promise<Partial<PageComponents>> =>
      name === 'booking'
        ? { booking: BookingRoute }
        : name === 'catalog'
          ? { catalog: CatalogRoute }
          : {},
    );
    const beforeUnload = vi.fn();
    window.addEventListener('beforeunload', beforeUnload);
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <StorefrontNavigation
          initialPathname={initialPathname}
          initialPage={<CatalogStart />}
          loadPageComponents={loadPageComponents}
        />
        <LocationOutput />
      </BrowserRouter>,
    );

    await user.click(screen.getByRole('link', { name: 'Book a service' }));
    expect(await screen.findByText('Booking studio-aurora service-corte')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/empresa/studio-aurora/agendar/service-corte');
    expect(screen.getByTestId('current-path')).toHaveTextContent(
      '/empresa/studio-aurora/agendar/service-corte',
    );

    window.history.back();
    await waitFor(() => {
      expect(window.location.pathname).toBe('/empresa/studio-aurora');
      expect(screen.getByText('studio-aurora catalog')).toBeInTheDocument();
    });

    window.history.forward();
    await waitFor(() => {
      expect(window.location.pathname).toBe('/empresa/studio-aurora/agendar/service-corte');
      expect(screen.getByText('Booking studio-aurora service-corte')).toBeInTheDocument();
    });

    expect(loadPageComponents).toHaveBeenCalledWith('booking');
    expect(beforeUnload).not.toHaveBeenCalled();
    window.removeEventListener('beforeunload', beforeUnload);
  });
});
