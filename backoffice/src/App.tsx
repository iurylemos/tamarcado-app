import type { JSX } from 'react';
import { AuthProvider } from './contexts/auth/auth.provider';
import BackofficeRouter from './router';

export default function App(): JSX.Element {
  return (
    <AuthProvider>
      <BackofficeRouter />
    </AuthProvider>
  );
}
