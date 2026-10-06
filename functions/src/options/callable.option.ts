import type { CallableOptions } from 'firebase-functions/v2/https';

export const callableOptionsBackoffice: CallableOptions = {
  region: 'southamerica-east1',
  invoker: 'public',
  cors: ['https://tamarcado-dad82-backoffice.web.app'],
};

export const callableOptionsPublic: CallableOptions = {
  region: 'southamerica-east1',
  invoker: 'public',
  cors: ['https://tamarcado-dad82.web.app'],
};

export const callableOptionsCollaborator: CallableOptions = {
  region: 'southamerica-east1',
  invoker: 'public',
  cors: ['https://tamarcado-dad82-collaborator.web.app'],
};

export const callableOptionsCollaboratorAndBackoffice: CallableOptions = {
  region: 'southamerica-east1',
  invoker: 'public',
  cors: [
    'https://tamarcado-dad82-collaborator.web.app',
    'https://tamarcado-dad82-backoffice.web.app',
  ],
};
