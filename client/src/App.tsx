import type { JSX } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useRouteBreadcrumb } from './hooks/useRouteBreadcrumb.hook';
import BookingPage from './pages/BookingPage';
import CompanyCatalogPage from './pages/CompanyCatalogPage';
import HomePage from './pages/HomePage';

export function App(): JSX.Element {
  useRouteBreadcrumb();

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/empresa/:slug" element={<CompanyCatalogPage />} />
      <Route path="/empresa/:slug/agendar/:productId" element={<BookingPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
