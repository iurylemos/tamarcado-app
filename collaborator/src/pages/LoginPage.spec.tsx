import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from './LoginPage';
import ProtectedRoute from '../router/ProtectedRoute';
import { WorkspaceLayout } from '../router';

const auth = vi.hoisted(() => ({
  user: null as object | null,
  loading: false,
  error: '',
  login: vi.fn(),
  logout: vi.fn(),
}));

vi.mock('../contexts/auth/auth.context', () => ({
  useAuth: () => auth,
}));

describe('collaborator login', () => {
  afterEach(cleanup);

  beforeEach(() => {
    auth.user = null;
    auth.loading = false;
    auth.error = '';
    auth.login.mockReset();
    auth.logout.mockReset();
  });

  it('signs in with e-mail and password', async () => {
    auth.login.mockResolvedValue(undefined);
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'ana@empresa.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha-forte-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() => expect(auth.login).toHaveBeenCalledWith('ana@empresa.com', 'senha-forte-1'));
    expect(screen.queryByLabelText(/telefone/i)).not.toBeInTheDocument();
  });

  it('shows a friendly message for wrong credentials', async () => {
    auth.login.mockRejectedValue({ code: 'auth/invalid-credential' });
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'ana@empresa.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha-forte-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.');
  });

  it('redirects an unauthenticated protected-route visit back to sign-in', async () => {
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/protected" element={<p>Dados protegidos</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Acesse sua agenda' })).toBeInTheDocument();
    expect(screen.queryByText('Dados protegidos')).not.toBeInTheDocument();
  });

  it('shows a retryable message when the auth service cannot be reached', async () => {
    auth.login.mockRejectedValue({ code: 'auth/network-request-failed' });
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'ana@empresa.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha-forte-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível conectar');
  });

  it('ends the session from the collaborator workspace navigation', () => {
    auth.user = {};
    render(
      <MemoryRouter>
        <WorkspaceLayout />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));
    expect(auth.logout).toHaveBeenCalledOnce();
  });
});
