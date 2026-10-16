import type { Breadcrumb, Event } from '@sentry/react';

export type SentryContextData = {
  breadcrumb: Breadcrumb | null;
};

export type SentryDeduplications = (event: Event) => Event | null;
