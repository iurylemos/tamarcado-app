import {
  init,
  browserTracingIntegration,
  replayIntegration,
  feedbackIntegration,
  setTag,
  getCurrentScope,
} from '@sentry/react';
import { SentryUtil } from '../utils/sentry.util';

export function initializeMonitoring(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const environment = import.meta.env.VITE_SENTRY_ENVIRONMENT || 'development';

  if (!import.meta.env.PROD || !dsn || environment === 'development') {
    console.info(
      'Sentry monitoring is disabled because no DSN is provided or the environment is development.',
    );

    return;
  }

  init({
    dsn,
    environment,
    integrations: [
      browserTracingIntegration(),
      replayIntegration(),
      feedbackIntegration({
        colorScheme: 'system',
      }),
    ],
    tracesSampleRate: 1.0,
    tracePropagationTargets: [
      /^\//,
      /^https:\/\/southamerica-east1-tamarcado-dad82\.cloudfunctions.net/,
    ],
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });

  setTag('app', 'collaborator');

  const scope = getCurrentScope();
  scope.addEventProcessor(SentryUtil.createDeduplicationProcessor());
}
