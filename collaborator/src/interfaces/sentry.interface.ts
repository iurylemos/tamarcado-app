import type { Breadcrumb } from '@sentry/react';

export type SentryContextData = {
  breadcrumb: Breadcrumb | null;
};
