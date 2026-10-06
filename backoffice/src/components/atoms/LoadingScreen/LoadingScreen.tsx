import type { JSX } from 'react';

type LoadingScreenProps = {
  message: string;
};

export default function LoadingScreen({ message }: Readonly<LoadingScreenProps>): JSX.Element {
  return (
    <main className="loading-screen" role="status" aria-live="polite">
      <div className="loading-card">
        <span className="brand-mark" aria-hidden="true">
          t
        </span>
        <span className="loading-spinner" aria-hidden="true" />
        <p className="eyebrow">TAMARCADO</p>
        <h1>Preparando seu espaço</h1>
        <p className="muted">{message}</p>
      </div>
    </main>
  );
}
