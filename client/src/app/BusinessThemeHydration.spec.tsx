import { act } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render as renderServer } from '../entry-server';
import { createQueryClient } from '../config/query-client.config';
import CatalogRoutePage from '../pages/CatalogRoutePage';
import StorefrontApp, { createPageElement } from './StorefrontApp';
import { resolvePageData } from './page-data';
import { matchRoute } from './routes';

vi.mock('../config/firebase.config', () => ({ db: {}, functions: {}, auth: {} }));
vi.mock('../services/catalog.service', () => ({
  getCompanyCatalog: vi.fn(() => new Promise(() => {})),
}));

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('business theme hydration', () => {
  it('hydrates the server theme without mismatches', async () => {
    const pathname = '/empresa/studio';
    const initialBusiness = {
      id: 'studio',
      slug: 'studio',
      name: 'Studio',
      segment: 'beauty' as const,
      primaryColor: '#fefefe',
      secondaryColor: '#123456',
    };
    const initial = { initialBusiness, initialCatalogStatus: 'ready' as const };
    const output = renderServer({ url: pathname, ...initial });
    document.body.innerHTML = `<div id="root">${output.appHtml}</div>`;
    window.history.replaceState({}, '', pathname);
    const container = document.getElementById('root')!;
    const serverStyle = container.querySelector('[data-custom-primary]')?.getAttribute('style');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const queryClient = createQueryClient();
    const page = resolvePageData(matchRoute(pathname), initial);
    const app = (
      <StorefrontApp
        pathname={pathname}
        queryClient={queryClient}
        page={createPageElement(page, { catalog: CatalogRoutePage })}
        routerMode="browser"
        loadPageComponents={async () => ({ catalog: CatalogRoutePage })}
      />
    );
    let root: ReturnType<typeof hydrateRoot>;
    await act(async () => {
      root = hydrateRoot(container, app);
    });
    expect(container.querySelector('[data-custom-primary]')?.getAttribute('style')).toBe(
      serverStyle,
    );
    expect(consoleError).not.toHaveBeenCalled();
    await act(async () => root.unmount());
    queryClient.clear();
  });
});
