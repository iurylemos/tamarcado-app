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

  it('normalizes each public color independently without additional reads', async () => {
    vi.mocked(getDocsFromServer).mockResolvedValue({
      docs: [
        {
          id: 'one',
          data: () => ({
            name: 'One',
            slug: 'one',
            segment: 'beauty',
            tenantId: 'private',
            primaryColor: 'AABBCC',
            secondaryColor: '#123456',
          }),
        },
        {
          id: 'two',
          data: () => ({
            name: 'Two',
            slug: 'two',
            segment: 'health',
            tenantId: 'private',
            secondaryColor: 'FEDCBA',
          }),
        },
        {
          id: 'three',
          data: () => ({ name: 'Three', slug: 'three', segment: 'other', tenantId: 'private' }),
        },
      ],
    } as never);

    expect(await readPublicBusinessSnapshot({} as Firestore)).toEqual([
      {
        id: 'one',
        name: 'One',
        slug: 'one',
        segment: 'beauty',
        primaryColor: '#aabbcc',
        secondaryColor: '#123456',
      },
      { id: 'two', name: 'Two', slug: 'two', segment: 'health', secondaryColor: '#fedcba' },
      { id: 'three', name: 'Three', slug: 'three', segment: 'other' },
    ]);
    expect(getDocsFromServer).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['primaryColor', 'red'],
    ['primaryColor', null],
    ['secondaryColor', '#123'],
    ['secondaryColor', 123456],
  ])('rejects malformed persisted %s values', async (field, value) => {
    vi.mocked(getDocsFromServer).mockResolvedValue({
      docs: [
        {
          id: 'invalid',
          data: () => ({
            name: 'Invalid',
            slug: 'invalid',
            segment: 'beauty',
            tenantId: 'private',
            [field]: value,
          }),
        },
      ],
    } as never);
    await expect(readPublicBusinessSnapshot({} as Firestore)).rejects.toThrow(/color/i);
  });
});
