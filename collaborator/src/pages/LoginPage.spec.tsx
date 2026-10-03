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
  requestCode: vi.fn(),
  verifyCode: vi.fn(),
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
    auth.requestCode.mockReset();
    auth.verifyCode.mockReset();
    auth.logout.mockReset();
  });

  it('requests and verifies a WhatsApp code', async () => {
    auth.requestCode.mockResolvedValue('challenge-1');
    auth.verifyCode.mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('Telefone com DDD'), {
      target: { value: '+5511999990001' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar código pelo WhatsApp' }));

    await screen.findByLabelText('Código de verificação');
    expect(auth.requestCode).toHaveBeenCalledWith('+5511999990001');

    fireEvent.change(screen.getByLabelText('Código de verificação'), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar código' }));
    await waitFor(() =>
      expect(auth.verifyCode).toHaveBeenCalledWith('challenge-1', '+5511999990001', '123456'),
    );
  });

  it('shows provider and verification errors without exposing a protected workspace', async () => {
    auth.requestCode.mockRejectedValue(new Error('Verificação por WhatsApp não configurada.'));
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('Telefone com DDD'), {
      target: { value: '+5511999990001' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar código pelo WhatsApp' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Verificação por WhatsApp não configurada.',
    );
    expect(screen.queryByText('Agendamentos')).not.toBeInTheDocument();
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

  it('shows a retryable message when the verification service cannot be reached', async () => {
    auth.requestCode.mockRejectedValue(
      Object.assign(new Error('internal [0]'), { code: 'functions/internal' }),
    );
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('Telefone com DDD'), {
      target: { value: '+5511999990001' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar código pelo WhatsApp' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível conectar ao serviço de verificação. Verifique sua conexão e tente novamente.',
    );
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
