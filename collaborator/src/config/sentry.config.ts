import {
  type Event as SentryEvent,
  type Breadcrumb as SentryBreadcrumb,
  init,
  browserTracingIntegration,
  replayIntegration,
  feedbackIntegration,
  setTag,
  getCurrentScope,
  logger,
} from '@sentry/react';

function createDeduplicationProcessor() {
  const recentEvents = new Map<string, number>();
  const DEDUP_WINDOW_MS = 30_000; // 30 seconds

  return (event: SentryEvent): SentryEvent | null => {
    const eventKey = JSON.stringify({
      message: event.message,
      exception: event.exception?.values?.[0]?.value,
      transaction: event.transaction,
    });

    const now = Date.now();
    const lastSeen = recentEvents.get(eventKey);

    if (lastSeen && now - lastSeen < DEDUP_WINDOW_MS) {
      return null; // Drop duplicate
    }

    recentEvents.set(eventKey, now);

    // Clean up old entries
    for (const [key, timestamp] of recentEvents.entries()) {
      if (now - timestamp > DEDUP_WINDOW_MS) {
        recentEvents.delete(key);
      }
    }

    return event;
  };
}

export function initializeMonitoring(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const environment = import.meta.env.VITE_SENTRY_ENVIRONMENT || 'development';

  if (!dsn) {
    logger.error('Sentry monitoring is disabled because no DSN is provided.');
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

  // Set fixed app identifier
  setTag('app', 'collaborator');

  // Add deduplication processor
  const scope = getCurrentScope();
  scope.addEventProcessor(createDeduplicationProcessor());
}

export function createSafeRouteBreadcrumb(path: string): SentryBreadcrumb | null {
  if (!path || path === '/') {
    return null;
  }

  // Strip query strings and fragments
  const cleanPath = path.split('?')[0].split('#')[0];

  // Map known routes to their templates (collaborator routes)
  // Order matters: more specific routes first
  const routeTemplates: Record<string, string> = {
    '/appointments/:id': '/appointments/:appointmentId',
    '/appointments': '/appointments',
    '/customers': '/customers',
    '/messages': '/messages',
    '/reports': '/reports',
    '/login': '/login',
  };

  // Try to match known routes first
  for (const [pattern, template] of Object.entries(routeTemplates)) {
    // Convert route pattern to regex (replace :param with [^/]+)
    const regexPattern = '^' + pattern.replace(/:([^/]+)/g, '[^/]+') + '(?:/|$)';
    if (new RegExp(regexPattern).test(cleanPath)) {
      return {
        category: 'navigation',
        data: { route: template },
        level: 'info',
        type: 'navigation',
      };
    }
  }

  // Fallback: generic template conversion
  const routeTemplate = cleanPath
    .split('/')
    .filter(Boolean)
    .map((segment) => {
      if (
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment) ||
        /^\d+$/.test(segment)
      ) {
        return ':id';
      }
      if (/^[a-z0-9-]+$/.test(segment)) {
        return ':slug';
      }
      return segment;
    })
    .join('/');

  return {
    category: 'navigation',
    data: { route: `/${routeTemplate}` },
    level: 'info',
    type: 'navigation',
  };
}
