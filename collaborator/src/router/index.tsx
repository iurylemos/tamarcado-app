import type { JSX } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../contexts/auth/auth.context';
import AppointmentDetailsPage from '../pages/AppointmentDetailsPage';
import AppointmentsPage from '../pages/AppointmentsPage';
import CustomersPage from '../pages/CustomersPage';
import MessagesPage from '../pages/MessagesPage';
import LoginPage from '../pages/LoginPage';
import ReportsPage from '../pages/ReportsPage';
import ProtectedRoute from './ProtectedRoute';
import SentryProvider from '../contexts/sentry/sentry.provider';
import AuthProvider from '../contexts/auth/auth.provider';

export function WorkspaceLayout(): JSX.Element {
  const { logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link className="app-brand" to="/appointments">
          <img src="/pwa-icon.svg" alt="Tá Marcado" />
        </Link>
        <nav aria-label="Navegação principal">
          <Link to="/appointments">Agendamentos</Link>
          <Link to="/customers">Clientes</Link>
          <Link to="/messages">Mensagens</Link>
          <Link to="/reports">Relatórios</Link>
        </nav>
        <button type="button" onClick={() => void logout()}>
          Sair
        </button>
      </header>
      <main>
        <Routes>
          <Route path="/appointments" element={<AppointmentsPage />} />
          <Route path="/appointments/:appointmentId" element={<AppointmentDetailsPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="*" element={<Navigate to="/appointments" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function CollaboratorRouter(): JSX.Element {
  return (
    <BrowserRouter>
      <SentryProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/*" element={<WorkspaceLayout />} />
            </Route>
          </Routes>
        </AuthProvider>
      </SentryProvider>
    </BrowserRouter>
  );
}
