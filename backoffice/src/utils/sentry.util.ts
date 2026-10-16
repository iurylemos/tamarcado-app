import type { Event as SentryEvent, Breadcrumb as SentryBreadcrumb } from '@sentry/react';
import type { SentryDeduplications } from '../interfaces/sentry.interface';

export class SentryUtil {
  public static createDeduplicationProcessor(): SentryDeduplications {
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

  public static createSafeRouteBreadcrumb(path: string): SentryBreadcrumb | null {
    if (!path || path === '/') {
      return null;
    }

    // Strip query strings and fragments
    const cleanPath = path.split('?')[0].split('#')[0];

    // Map known routes to their templates (backoffice routes)
    const routeTemplates: Record<string, string> = {
      '/login': '/login',
      '/workspace': '/workspace',
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
}
