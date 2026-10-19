import type {
  ErrorEvent,
  Breadcrumb as SentryBreadcrumb,
  Event as SentryEvent,
} from '@sentry/react';
import type { SentryDeduplications, SentryDataCollection } from '../interfaces/sentry.interface';

export class SentryUtil {
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

      if (typeof operation !== 'string' || !/^[a-z_]{1,50}$/.test(operation)) return null;

      return {
        category: 'app.operation',
        data: { operation },
        level: breadcrumb.level,
        type: 'default',
      };
    }

    return null;
  }

  private static safeExceptionType(type: string | undefined): string {
    const safeTypes = new Set([
      'Error',
      'TypeError',
      'RangeError',
      'SyntaxError',
      'ReferenceError',
      'URIError',
      'EvalError',
      'AggregateError',
    ]);

    return type && safeTypes.has(type) ? type : 'Error';
  }

  private static safeFrameFilename(filename: string | undefined): string {
    if (!filename) return 'app.bundle.js';

    const pathname = filename.split(/[?#]/, 1)[0] ?? '';
    const match = pathname.match(/(?:^|\/)assets\/([A-Za-z0-9_.-]+\.js)$/);

    return match ? `assets/${match[1]}` : 'app.bundle.js';
  }

  public static sanitizeEvent(event: ErrorEvent): ErrorEvent {
    event.message = undefined;
    event.fingerprint = undefined;
    event.user = undefined;
    event.request = undefined;
    event.extra = undefined;
    event.contexts = undefined;
    event.logentry = undefined;
    event.tags = { app: 'client' };

    event.transaction =
      typeof window === 'undefined'
        ? 'unknown'
        : (this.routeTemplate(window.location.pathname) ?? 'unknown');

    if (event.exception?.values) {
      event.exception = {
        values: event.exception.values.map((exception) => {
          const safeStacktrace = exception.stacktrace
            ? {
                frames: exception.stacktrace.frames?.map((frame) => ({
                  filename: this.safeFrameFilename(frame.filename),
                  ...(frame.lineno !== undefined ? { lineno: frame.lineno } : {}),
                  ...(frame.colno !== undefined ? { colno: frame.colno } : {}),
                  ...(frame.in_app !== undefined ? { in_app: frame.in_app } : {}),
                })),
              }
            : undefined;

          return {
            type: this.safeExceptionType(exception.type),
            value: 'Unexpected client error',
            ...(typeof exception.mechanism?.handled === 'boolean'
              ? { mechanism: { type: 'generic', handled: exception.mechanism.handled } }
              : {}),
            ...(safeStacktrace ? { stacktrace: safeStacktrace } : {}),
          };
        }),
      };
    }

    event.breadcrumbs = (event.breadcrumbs ?? [])
      .map((breadcrumb) => this.sanitizeBreadcrumb(breadcrumb))
      .filter((breadcrumb: SentryBreadcrumb | null) => breadcrumb !== null);

    return event;
  }

  public static createDeduplicationProcessor(): SentryDeduplications {
    const recentEvents = new Map<string, number>();
    const deduplicationWindowMs = 30_000;

    return (event: SentryEvent): SentryEvent | null => {
      const firstException = event.exception?.values?.[0];
      const eventKey = JSON.stringify({
        type: firstException ? this.safeExceptionType(firstException.type) : undefined,
        frames: firstException?.stacktrace?.frames?.map((frame) => ({
          filename: this.safeFrameFilename(frame.filename),
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
