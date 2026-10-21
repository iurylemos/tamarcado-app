import { type JSX, lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import LoadingScreen from '../components/atoms/LoadingScreen/LoadingScreen';

const LoginPage = lazy(() => import('../pages/LoginPage'));
const ProtectedRoute = lazy(() => import('./ProtectedRoute'));
const BackofficeWorkspace = lazy(() => import('../Workspace'));

export default function BackofficeRouter(): JSX.Element {
  return (
    <Suspense fallback={<LoadingScreen message="Verificando sua sessão com segurança..." />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/*" element={<BackofficeWorkspace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
