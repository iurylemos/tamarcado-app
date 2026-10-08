import { StrictMode, type JSX } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import { companyCatalogQueryKey, queryClient } from './services/query-client';
import './styles/index.css';

const root = document.getElementById('root');

if (!root) throw new Error('Root element not found.');

const ssrData = window.__TAMARCADO_SSR__;

if (ssrData) {
  queryClient.setQueryData(companyCatalogQueryKey(ssrData.catalog.business.slug), ssrData.catalog);
}

const app: JSX.Element = (
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);

if (ssrData) hydrateRoot(root, app);
else createRoot(root).render(app);
