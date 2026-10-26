import { StrictMode, type FC, type JSX } from 'react';
import { createRoot, hydrateRoot, type RootOptions } from 'react-dom/client';
import { reactErrorHandler, withErrorBoundary } from '@sentry/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { initializeMonitoring } from './config/sentry.config';
import { ReactQueryConfig } from './config/react-query.config';
import FallbackError from './components/atoms/FallbackError';
import SentryProvider from './contexts/sentry/sentry.provider';
import ClientRouter from './router';
import './styles/index.css';

initializeMonitoring();

const optionsRoot: RootOptions = {
  onUncaughtError: reactErrorHandler(),
  onCaughtError: reactErrorHandler(),
  onRecoverableError: reactErrorHandler(),
};

const root = document.getElementById('root');

if (!root) throw new Error('Root element not found.');

const ssrData = window.__TAMARCADO_SSR__;

if (ssrData) {
  ReactQueryConfig.queryClient.setQueryData(
    ReactQueryConfig.companyCatalogQueryKey(ssrData.catalog.business.slug),
    ssrData.catalog,
  );
}

const App: FC = (): JSX.Element => (
  <StrictMode>
    <BrowserRouter>
      <SentryProvider>
        <QueryClientProvider client={ReactQueryConfig.queryClient}>
          <ClientRouter />
        </QueryClientProvider>
      </SentryProvider>
    </BrowserRouter>
  </StrictMode>
);

const AppFallback: FC = withErrorBoundary(App, {
  fallback: <FallbackError />,
  onError: reactErrorHandler(),
});

if (ssrData) hydrateRoot(root, <AppFallback />, optionsRoot);
else createRoot(root, optionsRoot).render(<AppFallback />);
