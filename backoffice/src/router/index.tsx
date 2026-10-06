import type { JSX } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import ProtectedRoute from './ProtectedRoute';
import BackofficeWorkspace from '../Workspace';

export default function BackofficeRouter(): JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/*" element={<BackofficeWorkspace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
