import { describe, expect, it, vi } from 'vitest';
import { getDocs } from 'firebase/firestore';
import { getCompanyCatalog } from './catalog.service';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_, name: string) => name),
  getDocs: vi.fn(),
  query: vi.fn((source, ...constraints) => ({ source, constraints })),
  where: vi.fn((field: string, _operator: string, value: unknown) => ({ field, value })),
}));

vi.mock('../config/firebase.config', () => ({ db: {} }));

describe('getCompanyCatalog', () => {
  it('starts business and service reads in parallel', () => {
    vi.mocked(getDocs).mockResolvedValue({ docs: [] } as never);

    void getCompanyCatalog('studio-aurora');

    expect(getDocs).toHaveBeenCalledTimes(2);
  });
});
