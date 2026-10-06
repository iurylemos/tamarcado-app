import { Navigate, Outlet } from 'react-router-dom';
import LoadingScreen from '../components/atoms/LoadingScreen/LoadingScreen';
import { useAuth } from '../contexts/auth/auth.context';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen message="Verificando sua sessão com segurança..." />;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
