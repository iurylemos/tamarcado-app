import { type JSX, lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import FallbackLoading from '../components/atoms/FallbackLoading';

const LoginPage = lazy(() => import('../pages/LoginPage'));
const ProtectedRoute = lazy(() => import('./ProtectedRoute'));
const BackofficeWorkspace = lazy(() => import('../Workspace'));

export default function BackofficeRouter(): JSX.Element {
  return (
    <Suspense fallback={<FallbackLoading message="Carregando seus dados" />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/*" element={<BackofficeWorkspace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
