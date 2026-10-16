import { StrictMode } from 'react';
import { createRoot, type RootOptions } from 'react-dom/client';
import { reactErrorHandler } from '@sentry/react';
import BackofficeRouter from './router';
import './styles/index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found.');

const optionsRoot: RootOptions = {
  onUncaughtError: reactErrorHandler(),
  onCaughtError: reactErrorHandler(),
  onRecoverableError: reactErrorHandler(),
};

createRoot(root, optionsRoot).render(
  <StrictMode>
    <BackofficeRouter />,
  </StrictMode>,
);
