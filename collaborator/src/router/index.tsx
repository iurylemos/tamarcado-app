import { type JSX, lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import FallbackLoading from '../components/atoms/FallbackLoading';

const LoginPage = lazy(() => import('../pages/LoginPage'));
const ProtectedRoute = lazy(() => import('./ProtectedRoute'));
const WorkspaceLayout = lazy(() => import('../components/templates/WorkspaceLayout'));

export default function CollaboratorRouter(): JSX.Element {
  return (
    <Suspense fallback={<FallbackLoading message="Carregando dados do seu usuário" />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/*" element={<WorkspaceLayout />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
