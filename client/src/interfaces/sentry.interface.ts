import { type Breadcrumb, type BrowserOptions, type Event, init } from '@sentry/react';

export enum SentryClientRequestOperation {
  AVAILABILITY_SEARCH = 'availability_search',
  APPOINTMENT_REGISTRATION = 'appointment_registration',
}

export type SentryContextData = {
  breadcrumb: Breadcrumb | null;
};

export type SentryDeduplications = (event: Event) => Event | null;

export type SentryBeforeSendSpan = NonNullable<BrowserOptions['beforeSendSpan']>;

export type SentryDataCollection = NonNullable<Parameters<typeof init>[0]['dataCollection']>;
