import { createContext } from 'react';
import type { SentryContextData } from '../../interfaces/sentry.interface';

export const SentryContext = createContext<SentryContextData>({ breadcrumb: null });
