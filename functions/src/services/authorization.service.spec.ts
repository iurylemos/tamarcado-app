import type { CallableRequest } from 'firebase-functions/v2/https';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserDocument } from '../model/user.model';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  doc: vi.fn(),
  collection: vi.fn(),
  warn: vi.fn(),
}));

vi.mock('firebase-functions', () => ({
  logger: { warn: mocks.warn },
}));

vi.mock('./firestore.service', () => ({
  firestore: {
    collection: mocks.collection,
  },
}));

import { authorizeActor, authorizeProfessional } from './authorization.service';

const user: UserDocument = {
  tenantId: 'tenant-a',
  role: 'collaborator',
  professionalId: 'professional-a',
  name: 'Ana Souza',
  phoneE164: '+5511999990001',
  active: true,
};

function makeRequest(overrides: Record<string, unknown> = {}): CallableRequest<unknown> {
  return {
    data: {},
    auth: {
      uid: 'user-a',
      token: {
        tenantId: 'tenant-a',
        role: 'collaborator',
        active: true,
        professionalId: 'professional-a',
        ...overrides,
      },
    },
  } as unknown as CallableRequest<unknown>;
}

describe('authorization service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockResolvedValue({ data: () => user });
    mocks.doc.mockReturnValue({ get: mocks.get });
    mocks.collection.mockReturnValue({ doc: mocks.doc });
  });

  it('returns only the active user whose current tenant, role, and professional scope match claims', async () => {
    await expect(authorizeProfessional(makeRequest(), 'professional-a')).resolves.toMatchObject({
      uid: 'user-a',
      tenantId: 'tenant-a',
      role: 'collaborator',
      professionalId: 'professional-a',
    });
  });

  it('rejects unauthenticated, inactive, wrong-role, cross-tenant, and stale-scope requests', async () => {
    await expect(
      authorizeActor({ data: {} } as unknown as CallableRequest<unknown>),
    ).rejects.toMatchObject({
      code: 'unauthenticated',
    });

    mocks.get.mockResolvedValueOnce({ data: () => ({ ...user, active: false }) });
    await expect(authorizeActor(makeRequest())).rejects.toMatchObject({
      code: 'permission-denied',
    });

    await expect(authorizeActor(makeRequest({ role: 'backoffice' }))).rejects.toMatchObject({
      code: 'permission-denied',
    });
    await expect(authorizeActor(makeRequest({ tenantId: 'tenant-b' }))).rejects.toMatchObject({
      code: 'permission-denied',
    });
    await expect(authorizeActor(makeRequest({ active: false }))).rejects.toMatchObject({
      code: 'permission-denied',
    });
    await expect(
      authorizeActor(makeRequest({ professionalId: 'professional-b' })),
    ).rejects.toMatchObject({
      code: 'permission-denied',
    });
  });

  it('logs which token claim differs without logging claim values', async () => {
    await expect(authorizeActor(makeRequest({ professionalId: undefined }))).rejects.toMatchObject({
      code: 'permission-denied',
    });

    expect(mocks.warn).toHaveBeenCalledWith(
      'Authorization rejected: token claims do not match the user document.',
      {
        uid: 'user-a',
        claimMatches: {
          active: true,
          tenantId: true,
          role: true,
          professionalId: false,
        },
      },
    );
  });

  it('rejects a collaborator outside their professional scope and a role not allowed for the operation', async () => {
    await expect(authorizeProfessional(makeRequest(), 'professional-b')).rejects.toMatchObject({
      code: 'permission-denied',
    });
    await expect(authorizeActor(makeRequest(), ['backoffice'])).rejects.toMatchObject({
      code: 'permission-denied',
    });
  });
});
