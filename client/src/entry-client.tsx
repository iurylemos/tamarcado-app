import type { JSX } from 'react';
import { createRoot, hydrateRoot, type RootOptions } from 'react-dom/client';
import StorefrontApp, { createPageElement } from './app/StorefrontApp';
import { resolvePageData } from './app/page-data';
import type { StorefrontInitialData } from './interfaces/storefront-render.interface';
import type { PageComponents } from './interfaces/page.interface';
import { createQueryClient } from './config/query-client.config';
import { RouteUtil } from './utils/route.util';
import './styles/index.css';
import './styles/theme.css';
import {
  ensureMonitoringInitialized,
  initializeMonitoringOnFirstInteraction,
} from './config/sentry-loader';

const stateElementId = '__STOREFRONT_STATE__';

const handleReactError: NonNullable<RootOptions['onUncaughtError']> = (error, errorInfo) => {
  void ensureMonitoringInitialized()
    .then(() => import('@sentry/react'))
    .then(({ reactErrorHandler }) => {
      reactErrorHandler()(error, errorInfo);
    })
    .catch((monitoringError: unknown) => {
      console.error('Failed to report a React error to Sentry.', monitoringError);
    });
};

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
  return element && element.textContent
    ? (JSON.parse(element.textContent) as StorefrontInitialData)
    : {};
}

async function bootstrap(): Promise<void> {
  const container = document.getElementById('root');
  if (!container) return;

  const { pathname } = window.location;
  const page = resolvePageData(RouteUtil.matchRoute(pathname), readInitialData());
  const components = await loadPageComponents(page.name);

  const app: JSX.Element = (
    <StorefrontApp
      pathname={pathname}
      queryClient={createQueryClient()}
      page={createPageElement(page, components)}
      routerMode="browser"
      loadPageComponents={loadPageComponents}
    />
  );

  const rootOptions: RootOptions = {
    onUncaughtError: handleReactError,
    onCaughtError: handleReactError,
    onRecoverableError: handleReactError,
  };

  if (container.firstElementChild) hydrateRoot(container, app, rootOptions);
  else createRoot(container, rootOptions).render(app);

  initializeMonitoringOnFirstInteraction();
}

void bootstrap();
