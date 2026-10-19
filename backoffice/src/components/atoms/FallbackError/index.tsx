import type { JSX } from 'react';

export default function FallbackError(): JSX.Element {
  return (
    <main
      role="alert"
      className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center"
    >
      <h1 className="text-xl font-semibold">Não foi possível carregar a aplicação</h1>

      <p>Ocorreu um erro inesperado. Tente novamente ou recarregue a página.</p>

      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-md px-4 py-2"
      >
        Recarregar página
      </button>
    </main>
  );
}
