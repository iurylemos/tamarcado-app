import { StrictMode, type JSX, type FC } from 'react';
import { createRoot, type RootOptions } from 'react-dom/client';
import { reactErrorHandler, withErrorBoundary } from '@sentry/react';
import { initializeMonitoring } from './config/sentry.config';
import { BrowserRouter } from 'react-router-dom';
import SentryProvider from './contexts/sentry/sentry.provider';
import AuthProvider from './contexts/auth/auth.provider';
import FallbackError from './components/atoms/FallbackError';
import BackofficeRouter from './router';
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
    <BrowserRouter>
      <SentryProvider>
        <AuthProvider>
          <BackofficeRouter />
        </AuthProvider>
      </SentryProvider>
    </BrowserRouter>
  </StrictMode>
);

const AppFallback: FC = withErrorBoundary(App, {
  fallback: <FallbackError />,
  onError: reactErrorHandler(),
});

createRoot(root, optionsRoot).render(<AppFallback />);
