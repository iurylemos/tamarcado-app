import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/auth/auth.context';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) return <main role="status">Verificando sessão…</main>;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
