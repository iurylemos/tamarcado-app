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
  requestCode: vi.fn(),
  verifyCode: vi.fn(),
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
    auth.requestCode.mockReset();
    auth.verifyCode.mockReset();
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

  it('requests and verifies a WhatsApp code for a backoffice account', async () => {
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

  it('shows authorization and provider errors', async () => {
    auth.requestCode.mockRejectedValue(new Error('A conta não tem acesso ao backoffice.'));
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
      'A conta não tem acesso ao backoffice.',
    );
    expect(screen.queryByText('Visão geral')).not.toBeInTheDocument();
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
      target: { value: '+5511999990010' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar código pelo WhatsApp' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível conectar ao serviço de verificação. Verifique sua conexão e tente novamente.',
    );
  });

  it('logs out from the authorized backoffice workspace', async () => {
    auth.user = {};
    render(<BackofficeWorkspace />);

    fireEvent.click(await screen.findByRole('button', { name: 'Sair da conta' }));
    expect(auth.logout).toHaveBeenCalledOnce();
  });
});
