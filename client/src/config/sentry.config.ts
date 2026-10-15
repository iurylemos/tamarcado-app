import {
  type Breadcrumb as SentryBreadcrumb,
  type ErrorEvent,
  type Event as SentryEvent,
  init,
  browserTracingIntegration,
  setTag,
  getCurrentScope,
  logger,
  metrics,
  startSpan,
  consoleLoggingIntegration,
  type Span,
} from '@sentry/react';
import { SentryClientRequestOperation } from '../interfaces/sentry.interface';

const functionsRegion = 'southamerica-east1';
const safeSpanAttributes = new Set([
  'app.operation',
  'app.stage',
  'http.request.method',
  'http.response.status_code',
]);
const safeRouteTemplates = new Set(['/', '/empresa/:slug', '/empresa/:slug/agendar/:productId']);

function routeTemplate(path: string): string | null {
  const pathname = path.split(/[?#]/, 1)[0] ?? '';

  if (safeRouteTemplates.has(pathname)) {
    return pathname;
  }

  if (/^\/empresa\/[^/]+\/agendar\/[^/]+\/?$/.test(pathname)) {
    return '/empresa/:slug/agendar/:productId';
  }

  if (/^\/empresa\/[^/]+\/?$/.test(pathname)) {
    return '/empresa/:slug';
  }

  return pathname === '/' ? '/' : null;
}

export function createSafeRouteBreadcrumb(path: string): SentryBreadcrumb | null {
  const route = routeTemplate(path);

  if (route === null) {
    return null;
  }

  return {
    category: 'navigation',
    data: { route },
    level: 'info',
    type: 'navigation',
  };
}

function sanitizeBreadcrumb(breadcrumb: SentryBreadcrumb | null): SentryBreadcrumb | null {
  if (breadcrumb?.category !== 'navigation') {
    return null;
  }

  const route =
    typeof breadcrumb.data?.route === 'string' ? routeTemplate(breadcrumb.data.route) : null;

  if (route === null) {
    return null;
  }

  return {
    category: 'navigation',
    data: { route },
    level: 'info',
    type: 'navigation',
  };
}

function safeFrameFilename(filename: string | undefined): string | undefined {
  if (!filename) {
    return undefined;
  }

  const cleanPath = filename.split(/[?#]/, 1)[0] ?? '';
  const basename = cleanPath.slice(cleanPath.lastIndexOf('/') + 1);

  return /^[\w.-]+\.(?:js|mjs|ts|tsx)$/i.test(basename) ? basename : undefined;
}

function sanitizeEvent(event: ErrorEvent): ErrorEvent;
function sanitizeEvent(event: SentryEvent): SentryEvent;
function sanitizeEvent(event: SentryEvent): SentryEvent {
  event.message = undefined;
  event.user = undefined;
  event.request = undefined;
  event.extra = undefined;
  event.contexts = undefined;
  event.tags = { app: 'client' };
  event.transaction =
    typeof window === 'undefined'
      ? 'unknown'
      : (routeTemplate(window.location.pathname) ?? 'unknown');

  if (event.exception?.values) {
    event.exception.values = event.exception.values.map((exception) => ({
      ...exception,
      value: 'Unexpected client error',
      stacktrace: exception.stacktrace
        ? {
            ...exception.stacktrace,
            frames: exception.stacktrace.frames?.map((frame) => ({
              ...frame,
              filename: safeFrameFilename(frame.filename ?? frame.abs_path),
              abs_path: undefined,
              vars: undefined,
              pre_context: undefined,
              context_line: undefined,
              post_context: undefined,
            })),
          }
        : undefined,
    }));
  }

  event.breadcrumbs = (event.breadcrumbs ?? [])
    .map(sanitizeBreadcrumb)
    .filter((breadcrumb): breadcrumb is SentryBreadcrumb => breadcrumb !== null);

  return event;
}

function functionsTraceTarget(): RegExp | null {
  if (import.meta.env.DEV) {
    return /^http:\/\/127\.0\.0\.1:5001\/[^/]+\/southamerica-east1\//;
  }

  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

  if (!projectId) {
    return null;
  }

  const escapedProjectId = projectId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^https://${functionsRegion}-${escapedProjectId}\\.cloudfunctions\\.net/`);
}

function isFunctionsRequest(url: string): boolean {
  return functionsTraceTarget()?.test(url) ?? false;
}

function createDeduplicationProcessor() {
  const recentEvents = new Map<string, number>();
  const deduplicationWindowMs = 30_000;

  return (event: SentryEvent): SentryEvent | null => {
    const firstException = event.exception?.values?.[0];
    const eventKey = JSON.stringify({
      type: firstException?.type,
      frames: firstException?.stacktrace?.frames?.map((frame) => ({
        filename: frame.filename,
        lineno: frame.lineno,
        colno: frame.colno,
      })),
    });
    const now = Date.now();
    const lastSeen = recentEvents.get(eventKey);

    if (lastSeen !== undefined && now - lastSeen < deduplicationWindowMs) {
      return null;
    }

    recentEvents.set(eventKey, now);

    for (const [key, timestamp] of recentEvents) {
      if (now - timestamp > deduplicationWindowMs) {
        recentEvents.delete(key);
      }
    }

    return event;
  };
}

export function initializeMonitoring(): void {
  const dsn = import.meta.env.PROD
    ? import.meta.env.VITE_SENTRY_DSN
    : import.meta.env.VITE_SENTRY_DSN_DEV;
  const functionsTarget = functionsTraceTarget();

  if (!dsn) {
    if (import.meta.env.PROD) {
      logger.warn('Sentry monitoring is disabled because no production DSN is configured.');
    }

    return;
  }

  init({
    dsn,
    environment: import.meta.env.PROD
      ? import.meta.env.VITE_SENTRY_ENVIRONMENT || 'production'
      : 'development',
    release: import.meta.env.VITE_SENTRY_RELEASE || undefined,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      stackFrameVariables: false,
      frameContextLines: 0,
    },
    tracesSampleRate: 0.1,
    tracePropagationTargets: functionsTarget ? [functionsTarget] : [],
    integrations: [
      browserTracingIntegration({
        shouldCreateSpanForRequest: isFunctionsRequest,
      }),
      consoleLoggingIntegration({ levels: ['info', 'warn', 'error'] }),
    ],
    beforeSend: sanitizeEvent,
    beforeSendSpan: (span) => {
      const attributes = Object.fromEntries(
        Object.entries(span.attributes ?? {}).filter(([key]) => safeSpanAttributes.has(key)),
      );
      const isHttpSpan =
        'http.request.method' in span.attributes || 'http.response.status_code' in span.attributes;
      const isClientRequest = span.name.startsWith('client.');

      return {
        ...span,
        name: isClientRequest
          ? span.name
          : isHttpSpan
            ? 'Firebase callable request'
            : 'Application operation',
        attributes,
      };
    },
    beforeBreadcrumb: sanitizeBreadcrumb,
  });

  setTag('app', 'client');
  getCurrentScope().addEventProcessor(createDeduplicationProcessor());
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
      try {
        return await request();
      } finally {
        const durationMs = Math.round(performance.now() - startedAt);
        span.setAttribute('app.stage', 'client_request');
        span.setAttribute('app.duration_ms', durationMs);

        logger.info('booking.performance', { operation, stage: 'client_request', durationMs });

        metrics.distribution('client.request.duration', durationMs, {
          unit: 'millisecond',
          attributes: { operation, stage: 'client_request' },
        });
      }
    },
  );
}
