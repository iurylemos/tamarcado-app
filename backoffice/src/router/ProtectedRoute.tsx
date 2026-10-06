import type { JSX } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import LoadingScreen from '../components/atoms/LoadingScreen/LoadingScreen';
import { useAuth } from '../contexts/auth/auth.context';

export default function ProtectedRoute(): JSX.Element {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen message="Verificando sua sessão com segurança..." />;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
