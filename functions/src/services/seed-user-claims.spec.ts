import { describe, expect, it } from 'vitest';
import { seedUserClaims, seedUsers } from '../../test/fixtures/seed-data';

describe('seed user claims', () => {
  it('includes the professional scope for the seeded collaborator account', () => {
    const collaborator = seedUsers.find((user) => user.role === 'collaborator');
    if (!collaborator) throw new Error('Collaborator seed user is missing.');

    expect(seedUserClaims(collaborator)).toMatchObject({
      tenantId: 'tenant-aurora',
      role: 'collaborator',
      active: true,
      professionalId: 'professional-ana',
    });
  });
});
