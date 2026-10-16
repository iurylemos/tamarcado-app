import { StrictMode, type JSX } from 'react';
import { createRoot, hydrateRoot, type RootOptions } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { companyCatalogQueryKey, queryClient } from './services/query-client';
import { reactErrorHandler } from '@sentry/react';
import { App } from './App';
import SentryProvider from './contexts/sentry/sentry.provider';
import './styles/index.css';

const optionsRoot: RootOptions = {
  onUncaughtError: reactErrorHandler(),
  onCaughtError: reactErrorHandler(),
  onRecoverableError: reactErrorHandler(),
};

const root = document.getElementById('root');

if (!root) throw new Error('Root element not found.');

const ssrData = window.__TAMARCADO_SSR__;

if (ssrData) {
  queryClient.setQueryData(companyCatalogQueryKey(ssrData.catalog.business.slug), ssrData.catalog);
}

const app: JSX.Element = (
  <StrictMode>
    <BrowserRouter>
      <SentryProvider>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </SentryProvider>
    </BrowserRouter>
  </StrictMode>
);

if (ssrData) hydrateRoot(root, app, optionsRoot);
else createRoot(root, optionsRoot).render(app);
