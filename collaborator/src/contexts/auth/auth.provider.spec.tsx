import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import { useAuth } from './auth.context';
import { AuthProvider } from './auth.provider';

const mocks = vi.hoisted(() => ({
  listener: undefined as ((user: User | null) => void) | undefined,
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth: unknown, listener: (user: User | null) => void) => {
    mocks.listener = listener;
    return vi.fn();
  },
}));

vi.mock('../../config/firebase.config', () => ({ auth: {} }));
vi.mock('../../services/auth.service', () => ({
  signInWithEmail: vi.fn(),
  signOutCurrentUser: vi.fn(),
}));

function SessionProbe() {
  const { tenantId } = useAuth();
  return <p>{tenantId}</p>;
}

describe('AuthProvider', () => {
  afterEach(cleanup);

  beforeEach(() => {
    mocks.listener = undefined;
  });

  it('refreshes the ID token before accepting the restored collaborator session', async () => {
    const getIdTokenResult = vi.fn().mockResolvedValue({
      claims: {
        role: 'collaborator',
        active: true,
        tenantId: 'tenant-aurora',
        professionalId: 'professional-ana',
      },
    });
    const user = { getIdTokenResult } as unknown as User;

    render(
      <AuthProvider>
        <SessionProbe />
      </AuthProvider>,
    );
    mocks.listener?.(user);

    expect(await screen.findByText('tenant-aurora')).toBeInTheDocument();
    await waitFor(() => expect(getIdTokenResult).toHaveBeenCalledWith(true));
  });
});
