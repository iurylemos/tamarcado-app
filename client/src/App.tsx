import type { JSX } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import BookingPage from './pages/BookingPage';
import CompanyCatalogPage from './pages/CompanyCatalogPage';
import CompanyListPage from './pages/CompanyListPage';
import PwaInstallPrompt from './components/organisms/PwaInstallPrompt/PwaInstallPrompt';

export function App(): JSX.Element {
  return (
    <>
      <Routes>
        <Route path="/" element={<CompanyListPage />} />
        <Route path="/empresa/:slug" element={<CompanyCatalogPage />} />
        <Route path="/empresa/:slug/agendar/:productId" element={<BookingPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <PwaInstallPrompt />
    </>
  );
}
