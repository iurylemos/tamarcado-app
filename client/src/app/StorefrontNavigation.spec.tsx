import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { JSX } from 'react';
import { BrowserRouter, Link, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PageComponents } from '../interfaces/page.interface';
import StorefrontNavigation from './StorefrontNavigation';

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
  it('navigates with the browser URL and restores routes with back and forward without document navigation', async () => {
    const initialPathname = '/empresa/studio-aurora';
    window.history.replaceState({}, '', initialPathname);
    const loadPageComponents = vi.fn(
      async (name: string): Promise<Partial<PageComponents>> =>
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
