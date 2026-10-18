import {
  init,
  browserTracingIntegration,
  setTag,
  getCurrentScope,
  metrics,
  startSpan,
  consoleLoggingIntegration,
  captureException,
  addBreadcrumb,
  getClient,
  type Span,
} from '@sentry/react';
import { SentryClientRequestOperation } from '../interfaces/sentry.interface';
import { SentryUtil } from '../utils/sentry.util';
import { FirebaseUtil } from '../utils/firebase.util';

function functionsTraceTarget(): RegExp | null {
  if (import.meta.env.DEV) {
    return /^http:\/\/127\.0\.0\.1:5001\/[^/]+\/southamerica-east1\//;
  }

  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

  if (!projectId) {
    return null;
  }

  const escapedProjectId = projectId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  return new RegExp(`^https://${FirebaseUtil.region}-${escapedProjectId}\\.cloudfunctions\\.net/`);
}

function isFunctionsRequest(url: string): boolean {
  return functionsTraceTarget()?.test(url) ?? false;
}

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

  const functionsTarget = functionsTraceTarget();

  init({
    dsn,
    environment,
    release: import.meta.env.VITE_SENTRY_RELEASE || undefined,
    dataCollection: SentryUtil.dataCollection,
    tracesSampleRate: 0.1,
    tracePropagationTargets: functionsTarget ? [functionsTarget] : [],
    integrations: [
      browserTracingIntegration({
        shouldCreateSpanForRequest: isFunctionsRequest,
      }),
      consoleLoggingIntegration({ levels: ['info', 'warn', 'error'] }),
    ],
    beforeSend: SentryUtil.sanitizeEvent,
    beforeSendSpan: SentryUtil.beforeSendSpan,
    beforeBreadcrumb: SentryUtil.sanitizeBreadcrumb,
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
