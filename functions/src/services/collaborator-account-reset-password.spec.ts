import type { Auth } from 'firebase-admin/auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  docGet: vi.fn(),
  queryGet: vi.fn(),
  updateUser: vi.fn(),
  setCustomUserClaims: vi.fn(),
  revokeRefreshTokens: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn(),
  where: vi.fn(),
  limit: vi.fn(),
}));

vi.mock('./firestore.service', () => ({
  firestore: {
    collection: mocks.collection,
  },
}));

import { resetCollaboratorPassword } from './collaborator-account.service';

const linkedUser = { id: 'user-a' };

describe('resetCollaboratorPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.docGet.mockImplementation(async () => ({
      data: () => ({ tenantId: 'tenant-a', active: true }),
    }));
    mocks.queryGet.mockResolvedValue({ docs: [linkedUser] });
    mocks.doc.mockReturnValue({ get: mocks.docGet });
    mocks.where.mockReturnValue({ where: mocks.where, limit: mocks.limit });
    mocks.limit.mockReturnValue({ get: mocks.queryGet });
    mocks.collection.mockImplementation((name: string) =>
      name === 'users' ? { where: mocks.where } : { doc: mocks.doc },
    );
  });

  it('repairs collaborator claims and revokes existing sessions when resetting a password', async () => {
    const auth = {
      updateUser: mocks.updateUser,
      setCustomUserClaims: mocks.setCustomUserClaims,
      revokeRefreshTokens: mocks.revokeRefreshTokens,
    };

    await resetCollaboratorPassword(
      'tenant-a',
      { professionalId: 'professional-a', password: 'new-password-123' },
      auth as unknown as Auth,
    );

    expect(mocks.updateUser).toHaveBeenCalledWith('user-a', { password: 'new-password-123' });
    expect(mocks.setCustomUserClaims).toHaveBeenCalledWith('user-a', {
      tenantId: 'tenant-a',
      role: 'collaborator',
      active: true,
      professionalId: 'professional-a',
    });
    expect(mocks.revokeRefreshTokens).toHaveBeenCalledWith('user-a');
  });
});
