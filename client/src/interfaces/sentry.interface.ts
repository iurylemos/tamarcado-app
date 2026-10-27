import { type Event, init } from '@sentry/react';

export enum SentryClientRequestOperation {
  AVAILABILITY_SEARCH = 'availability_search',
  APPOINTMENT_REGISTRATION = 'appointment_registration',
}

export type SentryDeduplications = (event: Event) => Event | null;

export type SentryDataCollection = NonNullable<Parameters<typeof init>[0]['dataCollection']>;
