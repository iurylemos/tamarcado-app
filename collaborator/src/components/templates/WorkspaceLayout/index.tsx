import { type JSX } from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../../../contexts/auth/auth.context';

import AppointmentDetailsPage from '../../../pages/AppointmentDetailsPage';
import AppointmentsPage from '../../../pages/AppointmentsPage';
import CustomersPage from '../../../pages/CustomersPage';
import MessagesPage from '../../../pages/MessagesPage';
import ReportsPage from '../../../pages/ReportsPage';

export default function WorkspaceLayout(): JSX.Element {
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
