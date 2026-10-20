import type { JSX } from 'react';

type FallbackLoadingProps = {
  message: string;
};

export default function FallbackLoading({ message }: Readonly<FallbackLoadingProps>): JSX.Element {
  return (
    <main
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex min-h-screen items-center justify-center overflow-hidden bg-linear-to-br from-slate-50 via-white to-orange-50/70 px-6"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-orange-200/30 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-orange-200/30 blur-3xl"
      />

      <section className="relative flex w-full max-w-sm flex-col items-center text-center">
        <div className="relative mb-8 flex h-20 w-20 items-center justify-center">
          <div className="absolute inset-0 animate-ping rounded-[1.75rem] bg-orange-400/10 [animation-duration:2.5s]" />

          <div className="relative flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-linear-to-br from-orange-500 to-orange-700 text-white shadow-xl shadow-orange-900/20">
            <span className="text-4xl font-black tracking-tighter">t</span>
          </div>

          <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-4 border-white bg-orange-400">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
          </span>
        </div>

        <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-orange-700">
          Tá Marcado
        </p>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Preparando seu espaço
          <span className="animate-pulse text-orange-500">...</span>
        </h1>

        <p className="mt-3 max-w-xs text-sm leading-6 text-slate-500">{message}</p>

        <div
          className="mt-8 h-1 w-40 overflow-hidden rounded-full bg-orange-100"
          aria-hidden="true"
        >
          <div className="h-full w-2/5 animate-[loading_1.4s_ease-in-out_infinite] rounded-full bg-linear-to-r from-orange-400 to-orange-600" />
        </div>

        <p className="mt-4 text-xs font-medium text-slate-400">Só um instante, estamos quase lá.</p>
      </section>

      <style>{`
        @keyframes loading {
          0% { transform: translateX(-110%); }
          100% { transform: translateX(250%); }
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            scroll-behavior: auto !important;
          }
        }
      `}</style>
    </main>
  );
}
