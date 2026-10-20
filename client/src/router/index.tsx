import { type JSX, lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import FallbackLoading from '../components/atoms/FallbackLoading';

const HomePage = lazy(() => import('../pages/HomePage'));
const CompanyCatalogPage = lazy(() => import('../pages/CompanyCatalogPage'));
const BookingPage = lazy(() => import('../pages/BookingPage'));

export default function ClientRouter(): JSX.Element {
  return (
    <Suspense fallback={<FallbackLoading message="Carregando..." />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/empresa/:slug" element={<CompanyCatalogPage />} />
        <Route path="/empresa/:slug/agendar/:productId" element={<BookingPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
