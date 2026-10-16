import type {
  ErrorEvent,
  Breadcrumb as SentryBreadcrumb,
  Event as SentryEvent,
} from '@sentry/react';
import type {
  SentryBeforeSendSpan,
  SentryDeduplications,
  SentryDataCollection,
} from '../interfaces/sentry.interface';

export class SentryUtil {
  public static readonly safeSpanAttributes = new Set([
    'app.operation',
    'app.stage',
    'http.request.method',
    'http.response.status_code',
  ]);

  public static readonly safeRouteTemplates = new Set([
    '/',
    '/empresa/:slug',
    '/empresa/:slug/agendar/:productId',
  ]);

  public static readonly dataCollection: SentryDataCollection = {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [],
    urlQueryParams: false,
    stackFrameVariables: false,
    frameContextLines: 0,
  };

  public static beforeSendSpan: SentryBeforeSendSpan = (span) => {
    const attributes = Object.fromEntries(
      Object.entries(span.attributes ?? {}).filter(([key]) => this.safeSpanAttributes.has(key)),
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
  };

  public static isUnexpectedError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return true;
    }

    if (error.name === 'AbortError') {
      return false;
    }

    return true;
  }

  public static routeTemplate(path: string): string | null {
    const pathname = path.split(/[?#]/, 1)[0] ?? '';

    if (this.safeRouteTemplates.has(pathname)) {
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

  public static createSafeRouteBreadcrumb(path: string): SentryBreadcrumb | null {
    const route = this.routeTemplate(path);

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

  public static sanitizeBreadcrumb(breadcrumb: SentryBreadcrumb | null): SentryBreadcrumb | null {
    if (!breadcrumb) return null;

    if (breadcrumb.category === 'navigation') {
      const route =
        typeof breadcrumb.data?.route === 'string'
          ? this.routeTemplate(breadcrumb.data.route)
          : null;

      return route
        ? {
            category: 'navigation',
            data: { route },
            level: 'info',
            type: 'navigation',
          }
        : null;
    }

    if (breadcrumb.category === 'app.operation') {
      const operation = breadcrumb.data?.operation;

      if (typeof operation !== 'string') return null;

      return {
        category: 'app.operation',
        data: { operation },
        level: breadcrumb.level,
        type: 'default',
      };
    }

    return null;
  }

  public static sanitizeEvent(event: ErrorEvent): ErrorEvent {
    event.message = undefined;
    event.user = undefined;
    event.request = undefined;
    event.extra = undefined;
    event.contexts = undefined;
    event.tags = { app: 'client' };

    event.transaction =
      typeof window === 'undefined'
        ? 'unknown'
        : (this.routeTemplate(window.location.pathname) ?? 'unknown');

    if (event.exception?.values) {
      event.exception.values = event.exception.values.map((exception) => ({
        ...exception,
        value: exception.type ?? 'Unexpected client error',
        stacktrace: exception.stacktrace,
      }));
    }

    event.breadcrumbs = (event.breadcrumbs ?? [])
      .map(this.sanitizeBreadcrumb)
      .filter((breadcrumb: SentryBreadcrumb | null) => breadcrumb !== null);

    return event;
  }

  public static createDeduplicationProcessor(): SentryDeduplications {
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
}
