import { createRoot, hydrateRoot } from 'react-dom/client';
import StorefrontApp, { createPageElement } from './app/StorefrontApp';
import { resolvePageData } from './app/page-data';
import type { StorefrontInitialData } from './interfaces/storefront-render.interface';
import type { PageComponents } from './interfaces/page.interface';
import { matchRoute } from './app/routes';
import { createQueryClient } from './config/query-client.config';
import './styles/index.css';

const stateElementId = '__STOREFRONT_STATE__';

// Each route ships only its own page code; the server HTML stays interactive-ready once it loads.
async function loadPageComponents(name: string): Promise<Partial<PageComponents>> {
  switch (name) {
    case 'home':
      return { home: (await import('./pages/HomePage')).default };
    case 'catalog':
      return { catalog: (await import('./pages/CatalogRoutePage')).default };
    case 'booking':
      return { booking: (await import('./pages/BookingPage')).default };
    default:
      return { notFound: (await import('./pages/ErrorPage')).default };
  }
}

function readInitialData(): StorefrontInitialData {
  const element = document.getElementById(stateElementId);
  return element?.textContent ? (JSON.parse(element.textContent) as StorefrontInitialData) : {};
}

async function bootstrap(): Promise<void> {
  const container = document.getElementById('root');
  if (!container) return;

  const { pathname } = window.location;
  const page = resolvePageData(matchRoute(pathname), readInitialData());
  const components = await loadPageComponents(page.name);

  const app = (
    <StorefrontApp
      pathname={pathname}
      queryClient={createQueryClient()}
      page={createPageElement(page, components)}
    />
  );

  if (container.firstElementChild) hydrateRoot(container, app);
  else createRoot(container).render(app);
}

void bootstrap();
