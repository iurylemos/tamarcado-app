import type { Breadcrumb } from '@sentry/react';

export enum SentryClientRequestOperation {
  AVAILABILITY_SEARCH = 'availability_search',
  APPOINTMENT_REGISTRATION = 'appointment_registration',
}

export type SentryContextData = {
  breadcrumb: Breadcrumb | null;
};
