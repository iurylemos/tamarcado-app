import { collection, getDocsFromServer, query, where, type Firestore } from 'firebase/firestore';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readPublicBusinessSnapshot } from './public-business-snapshot';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((db: unknown, name: string) => ({ db, name })),
  getDocsFromServer: vi.fn(),
  query: vi.fn((source: unknown, ...constraints: unknown[]) => ({ source, constraints })),
  where: vi.fn((field: string, operator: string, value: unknown) => ({
    field,
    operator,
    value,
  })),
}));

describe('readPublicBusinessSnapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads only published public businesses and returns a minimal public projection', async () => {
    vi.mocked(getDocsFromServer).mockResolvedValue({
      docs: [
        {
          id: 'business-doc-1',
          data: () => ({
            name: 'Studio Aurora',
            slug: 'studio-aurora',
            segment: 'beauty',
            tenantId: 'internal-tenant-1',
            description: 'Public description',
            logoUrl: 'https://cdn.example.test/logo.png',
            privateField: 'must not be copied',
          }),
        },
      ],
    } as never);

    const snapshot = await readPublicBusinessSnapshot({} as Firestore);

    expect(collection).toHaveBeenCalledWith(expect.anything(), 'public_businesses');
    expect(where).toHaveBeenCalledExactlyOnceWith('published', '==', true);
    expect(query).toHaveBeenCalledTimes(1);
    expect(snapshot).toEqual([
      {
        id: 'business-doc-1',
        name: 'Studio Aurora',
        slug: 'studio-aurora',
        segment: 'beauty',
        description: 'Public description',
        logoUrl: 'https://cdn.example.test/logo.png',
      },
    ]);
    expect(snapshot[0]).not.toHaveProperty('tenantId');
    expect(snapshot[0]).not.toHaveProperty('privateField');
  });

  it('rejects invalid business fields and duplicate slugs before returning a snapshot', async () => {
    vi.mocked(getDocsFromServer).mockResolvedValue({
      docs: [
        {
          id: 'business-doc-1',
          data: () => ({
            name: 'Studio Aurora',
            slug: 'Studio Aurora',
            segment: 'beauty',
            tenantId: 'internal-tenant-1',
          }),
        },
      ],
    } as never);

    await expect(readPublicBusinessSnapshot({} as Firestore)).rejects.toThrow(
      'A published public business record is invalid.',
    );

    vi.mocked(getDocsFromServer).mockResolvedValue({
      docs: [
        {
          id: 'business-doc-1',
          data: () => ({
            name: 'Studio Aurora',
            slug: 'studio-aurora',
            segment: 'beauty',
            tenantId: 'internal-tenant-1',
          }),
        },
        {
          id: 'business-doc-2',
          data: () => ({
            name: 'Another Studio',
            slug: 'studio-aurora',
            segment: 'beauty',
            tenantId: 'internal-tenant-2',
          }),
        },
      ],
    } as never);

    await expect(readPublicBusinessSnapshot({} as Firestore)).rejects.toThrow(
      'Published public business records contain duplicate slugs.',
    );
  });
});
