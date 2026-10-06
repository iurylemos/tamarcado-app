import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { LoadingProvider } from './contexts/LoadingContext';
import './styles/index.css';

const root = document.getElementById('root');

if (!root) throw new Error('Root element not found.');

createRoot(root).render(
  <StrictMode>
    <LoadingProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </LoadingProvider>
  </StrictMode>,
);
