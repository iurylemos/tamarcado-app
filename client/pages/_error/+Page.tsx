import type { JSX } from 'react';
import { motion } from 'framer-motion';
import { usePageContext } from 'vike-react/usePageContext';

export default function Page(): JSX.Element {
  const pageContext = usePageContext();

  let msg: string = '';

  const { abortReason, abortStatusCode, is404 } = pageContext;

  if (typeof abortReason === 'object' && abortReason.notAdmin) {
    msg = 'Você não pode acessar esta página porque não é um administrador.';
  } else if (typeof abortReason === 'string') {
    msg = abortReason;
  } else if (abortStatusCode === 403) {
    msg = 'Você não pode acessar esta página porque não possui permissões suficientes.';
  } else if (abortStatusCode === 401) {
    msg =
      'Você não pode acessar esta página porque não está autenticado. Faça login para continuar.';
  } else {
    msg = is404 ? 'Esta página não existe.' : 'Algo deu errado. Tente novamente mais tarde.';
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-6 py-16 text-slate-900">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute -bottom-40 -right-20 h-96 w-96 rounded-full bg-teal-200/40 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_0.7px,transparent_0.7px)] bg-size-[24px_24px] opacity-30" />
      </div>

      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-xl text-center"
      >
        <motion.div
          animate={{ y: [0, -8, 0], rotate: [0, -2, 2, 0] }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="relative mx-auto mb-8 flex h-32 w-32 items-center justify-center rounded-4xl border border-white bg-white/80 shadow-xl shadow-emerald-900/5 backdrop-blur"
        >
          <div className="absolute inset-3 rounded-3xl bg-emerald-50" />

          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="relative h-14 w-14 text-emerald-700"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.75 3v2.25M17.25 3v2.25M3.75 8.25h16.5M5.25 4.5h13.5A1.5 1.5 0 0 1 20.25 6v14.25H3.75V6a1.5 1.5 0 0 1 1.5-1.5Z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" d="m9 13.5 6 6m0-6-6 6" />
          </svg>

          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4, type: 'spring' }}
            className="absolute -right-2 -top-2 flex h-10 w-10 items-center justify-center rounded-2xl border-4 border-slate-50 bg-rose-500 text-white shadow-lg"
          >
            !
          </motion.span>
        </motion.div>

        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-800">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Tá Marcado
        </p>

        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          Ops! Algo deu errado.
        </h1>

        <p className="mx-auto mt-5 max-w-md text-base leading-7 text-slate-600 sm:text-lg">
          Não conseguimos encontrar esta página. Ela pode ter sido removida ou o endereço pode estar
          incorreto.
          <br />
          {msg}
        </p>

        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 py-3.5 font-semibold text-white shadow-lg shadow-emerald-700/20 transition hover:-translate-y-0.5 hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-200"
          >
            Tentar novamente
          </button>

          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50 focus:outline-none focus:ring-4 focus:ring-emerald-100"
          >
            Voltar ao início
          </a>
        </div>

        <p className="mt-12 text-sm text-slate-400">
          Precisa de ajuda? Estamos aqui para ajudar você.
        </p>
      </motion.section>
    </main>
  );
}
