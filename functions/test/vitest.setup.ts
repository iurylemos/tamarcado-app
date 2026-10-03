import { afterAll, afterEach, vi } from 'vitest';
import { deleteApp, getApps } from 'firebase-admin/app';

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await Promise.all(getApps().map((app) => deleteApp(app)));
});
