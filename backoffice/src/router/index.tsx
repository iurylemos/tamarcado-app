import type { JSX } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import ProtectedRoute from './ProtectedRoute';
import BackofficeWorkspace from '../Workspace';
import SentryProvider from '../contexts/sentry/sentry.provider';

export default function BackofficeRouter(): JSX.Element {
  return (
    <BrowserRouter>
      <SentryProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/*" element={<BackofficeWorkspace />} />
          </Route>
        </Routes>
      </SentryProvider>
    </BrowserRouter>
  );
}
