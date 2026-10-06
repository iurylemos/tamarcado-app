import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import { LoadingProvider } from './contexts/LoadingContext';
import { companyCatalogQueryKey, queryClient } from './services/query-client';
import type { CompanyCatalog } from './interfaces/company.interface';
import './styles/index.css';

declare global {
  interface Window {
    __TAMARCADO_SSR__?: { catalog: CompanyCatalog };
  }
}

const root = document.getElementById('root');

if (!root) throw new Error('Root element not found.');

const ssrData = window.__TAMARCADO_SSR__;

if (ssrData) {
  queryClient.setQueryData(
    companyCatalogQueryKey(ssrData.catalog.business.slug),
    ssrData.catalog,
  );
}

const app = (
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <LoadingProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </LoadingProvider>
    </QueryClientProvider>
  </StrictMode>
);

if (ssrData) hydrateRoot(root, app);
else createRoot(root).render(app);
