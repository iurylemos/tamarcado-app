import { StrictMode, type FC, type JSX } from 'react';
import { createRoot, type RootOptions } from 'react-dom/client';
import { reactErrorHandler, withErrorBoundary } from '@sentry/react';
import { initializeMonitoring } from './config/sentry.config';
import CollaboratorRouter from './router';
import FallbackError from './components/atoms/FallbackError';
import './styles/index.css';

initializeMonitoring();

const root = document.getElementById('root');

if (!root) throw new Error('Root element not found.');

const optionsRoot: RootOptions = {
  onUncaughtError: reactErrorHandler(),
  onCaughtError: reactErrorHandler(),
  onRecoverableError: reactErrorHandler(),
};

const App: FC = (): JSX.Element => (
  <StrictMode>
    <CollaboratorRouter />
  </StrictMode>
);

const AppFallback: FC = withErrorBoundary(App, {
  fallback: <FallbackError />,
  onError: reactErrorHandler(),
});

createRoot(root, optionsRoot).render(<AppFallback />);
