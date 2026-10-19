import { init, setTag, getCurrentScope, getClient, browserTracingIntegration } from '@sentry/react';
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

  const sentryClient = getClient();

  if (sentryClient) {
    console.info('Sentry client is already initialized.');

    return;
  }

  init({
    dsn,
    environment,
    release: import.meta.env.VITE_SENTRY_RELEASE || undefined,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: {
        request: false,
        response: false,
      },
      httpBodies: [],
      urlQueryParams: false,
      genAI: {
        inputs: false,
        outputs: false,
      },
      databaseQueryData: false,
      queues: false,
      graphQL: {
        document: false,
        variables: false,
      },
    },
    integrations: [browserTracingIntegration()],
    tracesSampleRate: 0.1,
    beforeSend: SentryUtil.sanitizeEvent,
    beforeBreadcrumb: SentryUtil.sanitizeBreadcrumb,
  });

  setTag('app', 'collaborator');

  const scope = getCurrentScope();
  scope.addEventProcessor(SentryUtil.createDeduplicationProcessor());
}
