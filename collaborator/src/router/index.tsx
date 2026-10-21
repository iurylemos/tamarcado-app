import { type JSX, lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import LoadingScreen from '../components/atoms/LoadingScreen/LoadingScreen';

const LoginPage = lazy(() => import('../pages/LoginPage'));
const ProtectedRoute = lazy(() => import('./ProtectedRoute'));
const WorkspaceLayout = lazy(() => import('../components/templates/WorkspaceLayout'));

export default function CollaboratorRouter(): JSX.Element {
  return (
    <Suspense fallback={<LoadingScreen message="Verificando sua sessão com segurança..." />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/*" element={<WorkspaceLayout />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
