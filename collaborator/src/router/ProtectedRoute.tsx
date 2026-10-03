import type { JSX } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/auth/auth.context';

export default function ProtectedRoute(): JSX.Element {
  const { user, loading } = useAuth();

  if (loading) return <main role="status">Verificando sessão…</main>;

  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
