import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  app: { name: 'test-app' },
  functions: { name: 'test-functions' },
  getFunctions: vi.fn(),
  connectFunctionsEmulator: vi.fn(),
  useEmulators: false,
}));

vi.mock('firebase/functions', () => ({
  getFunctions: mocks.getFunctions,
  connectFunctionsEmulator: mocks.connectFunctionsEmulator,
}));
vi.mock('./firebase.config', () => ({
  firebaseApp: mocks.app,
  get useEmulators() {
    return mocks.useEmulators;
  },
}));

describe('Firebase Functions configuration', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.getFunctions.mockReturnValue(mocks.functions);
    mocks.useEmulators = false;
  });

  it('initializes the existing app in the configured region', async () => {
    const config = await import('./firebase-functions.config');

    expect(config.functions).toBe(mocks.functions);
    expect(mocks.getFunctions).toHaveBeenCalledWith(mocks.app, 'southamerica-east1');
    expect(mocks.connectFunctionsEmulator).not.toHaveBeenCalled();
  });

  it('connects the functions emulator when enabled', async () => {
    mocks.useEmulators = true;
    await import('./firebase-functions.config');

    expect(mocks.connectFunctionsEmulator).toHaveBeenCalledWith(mocks.functions, '127.0.0.1', 5001);
  });
});
