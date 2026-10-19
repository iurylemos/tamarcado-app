import type {
  ErrorEvent,
  Event as SentryEvent,
  Breadcrumb as SentryBreadcrumb,
} from '@sentry/react';
import type { SentryDeduplications } from '../interfaces/sentry.interface';

export class SentryUtil {
  public static createDeduplicationProcessor(): SentryDeduplications {
    const recentEvents = new Map<string, number>();
    const DEDUP_WINDOW_MS = 30_000;

    return (event: SentryEvent): SentryEvent | null => {
      const eventKey = JSON.stringify({
        type: event.exception?.values?.[0] ? 'Error' : undefined,
        frames: event.exception?.values?.[0]?.stacktrace?.frames?.map((frame) => ({
          filename: this.safeFrameFilename(frame.filename),
          lineno: frame.lineno,
          colno: frame.colno,
        })),
      });

      const now = Date.now();
      const lastSeen = recentEvents.get(eventKey);

      if (lastSeen && now - lastSeen < DEDUP_WINDOW_MS) {
        return null;
      }

      recentEvents.set(eventKey, now);

      for (const [key, timestamp] of recentEvents.entries()) {
        if (now - timestamp > DEDUP_WINDOW_MS) {
          recentEvents.delete(key);
        }
      }

      return event;
    };
  }

  private static readonly routeTemplates = new Map<string, RegExp>([
    ['/login', /^\/login\/?$/],
    ['/appointments', /^\/appointments\/?$/],
    ['/appointments/:appointmentId', /^\/appointments\/[^/]+\/?$/],
    ['/customers', /^\/customers\/?$/],
    ['/messages', /^\/messages\/?$/],
    ['/reports', /^\/reports\/?$/],
  ]);

  public static routeTemplate(path: string): string | null {
    const pathname = path.split(/[?#]/, 1)[0] ?? '';
    for (const [template, pattern] of this.routeTemplates) {
      if (pattern.test(pathname)) return template;
    }
    return null;
  }

  public static createSafeRouteBreadcrumb(path: string): SentryBreadcrumb | null {
    const route = this.routeTemplate(path);
    if (!route) return null;

    return {
      category: 'navigation',
      data: { route },
      level: 'info',
      type: 'navigation',
    };
  }

  private static safeFrameFilename(filename: string | undefined): string {
    if (!filename) return 'app.bundle.js';
    const pathname = filename.split(/[?#]/, 1)[0] ?? '';
    const match = pathname.match(/(?:^|\/)assets\/([A-Za-z0-9_.-]+\.js)$/);
    return match ? `assets/${match[1]}` : 'app.bundle.js';
  }

  public static sanitizeBreadcrumb(breadcrumb: SentryBreadcrumb | null): SentryBreadcrumb | null {
    if (breadcrumb?.category !== 'navigation') return null;
    const route =
      typeof breadcrumb.data?.route === 'string' ? this.routeTemplate(breadcrumb.data.route) : null;
    return route
      ? { category: 'navigation', data: { route }, level: 'info', type: 'navigation' }
      : null;
  }

  public static sanitizeEvent(event: ErrorEvent): ErrorEvent {
    event.message = undefined;
    event.fingerprint = undefined;
    event.user = undefined;
    event.request = undefined;
    event.extra = undefined;
    event.contexts = undefined;
    event.logentry = undefined;
    event.tags = { app: 'collaborator' };
    event.transaction =
      typeof window === 'undefined'
        ? 'unknown'
        : (this.routeTemplate(window.location.pathname) ?? 'unknown');
    if (event.exception?.values) {
      event.exception = {
        values: event.exception.values.map((exception) => ({
          type: 'Error',
          value: 'Unexpected client error',
          ...(typeof exception.mechanism?.handled === 'boolean'
            ? { mechanism: { type: 'generic', handled: exception.mechanism.handled } }
            : {}),
          ...(exception.stacktrace
            ? {
                stacktrace: {
                  frames: exception.stacktrace.frames?.map((frame) => ({
                    filename: this.safeFrameFilename(frame.filename),
                    ...(frame.lineno !== undefined ? { lineno: frame.lineno } : {}),
                    ...(frame.colno !== undefined ? { colno: frame.colno } : {}),
                    ...(frame.in_app !== undefined ? { in_app: frame.in_app } : {}),
                  })),
                },
              }
            : {}),
        })),
      };
    }
    event.breadcrumbs = (event.breadcrumbs ?? [])
      .map((breadcrumb) => this.sanitizeBreadcrumb(breadcrumb))
      .filter((breadcrumb): breadcrumb is SentryBreadcrumb => breadcrumb !== null);
    return event;
  }
}
