import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from './LoginPage';
import ProtectedRoute from '../router/ProtectedRoute';
import BackofficeWorkspace from '../Workspace';

const auth = vi.hoisted(() => ({
  user: null as object | null,
  loading: false,
  error: '',
  login: vi.fn(),
  logout: vi.fn(),
}));
const admin = vi.hoisted(() => ({ getWorkspace: vi.fn() }));

vi.mock('../contexts/auth/auth.context', () => ({
  useAuth: () => auth,
}));
vi.mock('../services/admin.service', () => ({
  getWorkspace: admin.getWorkspace,
  errorMessage: (error: unknown) => (error instanceof Error ? error.message : 'Falha'),
}));
vi.mock('./DashboardPage', () => ({ default: () => <div>Dashboard protegido</div> }));
vi.mock('./CompanySettingsPage', () => ({ default: () => <div>Empresa</div> }));
vi.mock('./ProductsPage', () => ({ default: () => <div>Serviços</div> }));
vi.mock('./ProfessionalsPage', () => ({ default: () => <div>Equipe</div> }));
vi.mock('./AvailabilityPage', () => ({ default: () => <div>Agenda</div> }));
vi.mock('./ReportsPage', () => ({ default: () => <div>Relatórios</div> }));

describe('backoffice login', () => {
  afterEach(cleanup);

  beforeEach(() => {
    auth.user = null;
    auth.loading = false;
    auth.error = '';
    auth.login.mockReset();
    auth.logout.mockReset();
    admin.getWorkspace.mockResolvedValue({
      company: { name: 'Aurora', timezone: 'America/Sao_Paulo', bookingIntervalMinutes: 15 },
      products: [],
      professionals: [],
      assignments: [],
      workingHours: [],
      blockedPeriods: [],
    });
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

  it('redirects unauthenticated users away from protected company routes', async () => {
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/protected" element={<p>Dados financeiros protegidos</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Gestão da empresa' })).toBeInTheDocument();
    expect(screen.queryByText('Dados financeiros protegidos')).not.toBeInTheDocument();
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

  it('logs out from the authorized backoffice workspace', async () => {
    auth.user = {};
    render(<BackofficeWorkspace />);

    fireEvent.click(await screen.findByRole('button', { name: 'Sair da conta' }));
    expect(auth.logout).toHaveBeenCalledOnce();
  });
});
