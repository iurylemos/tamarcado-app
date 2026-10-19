import type {
  Breadcrumb as SentryBreadcrumb,
  ErrorEvent,
  Event as SentryEvent,
} from '@sentry/react';
import type { SentryDeduplications } from '../interfaces/sentry.interface';

export class SentryUtil {
  public static createDeduplicationProcessor(): SentryDeduplications {
    const recentEvents = new Map<string, number>();
    const DEDUP_WINDOW_MS = 30_000;

    return (event: SentryEvent): SentryEvent | null => {
      const firstException = event.exception?.values?.[0];
      const eventKey = JSON.stringify({
        type: firstException ? 'Error' : undefined,
        frames: firstException?.stacktrace?.frames?.map((frame) => ({
          filename: this.safeFrameFilename(frame.filename),
          lineno: frame.lineno,
          colno: frame.colno,
        })),
      });
      const now = Date.now();
      const lastSeen = recentEvents.get(eventKey);

      if (lastSeen !== undefined && now - lastSeen < DEDUP_WINDOW_MS) return null;

      recentEvents.set(eventKey, now);
      for (const [key, timestamp] of recentEvents) {
        if (now - timestamp > DEDUP_WINDOW_MS) recentEvents.delete(key);
      }
      return event;
    };
  }

  public static routeTemplate(path: string): string | null {
    const pathname = path.split(/[?#]/, 1)[0] ?? '';
    if (pathname === '/login') return '/login';
    return pathname.startsWith('/login/') ? null : '/workspace';
  }

  public static createSafeRouteBreadcrumb(path: string): SentryBreadcrumb | null {
    const route = this.routeTemplate(path);
    return route
      ? { category: 'navigation', data: { route }, level: 'info', type: 'navigation' }
      : null;
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
    event.tags = { app: 'backoffice' };
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
