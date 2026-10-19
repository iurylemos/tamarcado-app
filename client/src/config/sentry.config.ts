import {
  init,
  setTag,
  getCurrentScope,
  metrics,
  startSpan,
  captureException,
  addBreadcrumb,
  getClient,
  browserTracingIntegration,
  type Span,
} from '@sentry/react';
import { SentryClientRequestOperation } from '../interfaces/sentry.interface';
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
    dataCollection: SentryUtil.dataCollection,
    beforeSend: SentryUtil.sanitizeEvent,
    beforeBreadcrumb: SentryUtil.sanitizeBreadcrumb,
    integrations: [browserTracingIntegration()],
    tracesSampleRate: 0.1,
  });

  setTag('app', 'client');
  getCurrentScope().addEventProcessor(SentryUtil.createDeduplicationProcessor());
}

export async function trackClientRequest<T>(
  operation: SentryClientRequestOperation,
  request: () => Promise<T>,
): Promise<T> {
  return await startSpan(
    {
      name: `client.${operation}`,
      op: 'app.request',
      attributes: { 'app.operation': operation },
    },
    async (span: Span): Promise<T> => {
      const startedAt = performance.now();

      addBreadcrumb({
        category: 'app.operation',
        message: 'Request started',
        level: 'info',
        data: { operation },
      });

      try {
        return await request();
      } catch (error: unknown) {
        span.setAttribute('app.stage', 'client_request_failed');

        addBreadcrumb({
          category: 'app.operation',
          message: 'Request failed',
          level: 'error',
          data: { operation },
        });

        if (SentryUtil.isUnexpectedError(error)) {
          captureException(error, {
            tags: {
              app: 'client',
              operation,
            },
          });
        }

        throw error;
      } finally {
        const durationMs = Math.round(performance.now() - startedAt);

        span.setAttribute('app.stage', 'client_request');
        span.setAttribute('app.duration_ms', durationMs);

        metrics.distribution('client.request.duration', durationMs, {
          unit: 'millisecond',
          attributes: { operation, stage: 'client_request' },
        });
      }
    },
  );
}
