import { useEffect, useState, type JSX } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import { auth } from './config/firebase.config';
import AppointmentDetailsPage from './pages/AppointmentDetailsPage';
import AppointmentsPage from './pages/AppointmentsPage';
import CustomersPage from './pages/CustomersPage';

interface Session {
  user: User | null;
  loading: boolean;
  error: string;
}

export default function App(): JSX.Element {
  const [session, setSession] = useState<Session>({
    user: null,
    loading: true,
    error: '',
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setSession({ user: null, loading: false, error: '' });
        return;
      }
      void user
        .getIdTokenResult()
        .then(({ claims }) => {
          if (claims.role !== 'collaborator' || typeof claims.tenantId !== 'string') {
            setSession({
              user: null,
              loading: false,
              error: 'Esta conta não tem acesso à área de colaboradores.',
            });
            return;
          }
          setSession({ user, loading: false, error: '' });
        })
        .catch((error: unknown) => {
          setSession({
            user: null,
            loading: false,
            error: error instanceof Error ? error.message : 'Não foi possível validar sua sessão.',
          });
        });
    });
    return unsubscribe;
  }, []);

  if (session.loading) {
    return (
      <main className="app-message" role="status">
        Verificando sessão...
      </main>
    );
  }

  if (session.error) {
    return (
      <main className="app-message feedback--error" role="alert">
        {session.error}
      </main>
    );
  }

  if (!session.user) {
    return (
      <main className="app-message">
        <h1>Acesso restrito</h1>
        <p>Entre com uma conta de colaborador para abrir sua agenda e o histórico de clientes.</p>
      </main>
    );
  }

  return (
    <BrowserRouter>
      <div className="app-shell">
        <header className="app-header">
          <Link className="app-brand" to="/appointments">
            Tamarcado
          </Link>
          <nav aria-label="Navegação principal">
            <Link to="/appointments">Agendamentos</Link>
            <Link to="/customers">Clientes</Link>
          </nav>
        </header>
        <main>
          <Routes>
            <Route path="/appointments" element={<AppointmentsPage />} />
            <Route path="/appointments/:appointmentId" element={<AppointmentDetailsPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="*" element={<Navigate to="/appointments" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
