import type { JSX } from 'react';

export default function HomeTemplate(): JSX.Element {
  return (
    <>
      <div className="market-bg" aria-hidden="true" />
      <main className="page market-page neutral-home">
        <section className="neutral-home-card" aria-labelledby="home-heading">
          <p className="eyebrow">TÁ MARCADO</p>
          <h1 id="home-heading">Acesse o catálogo do seu negócio</h1>
          <p>Peça o link diretamente ao negócio para conhecer os serviços e agendar.</p>
          <p className="neutral-home-note">
            Cada negócio compartilha seu próprio catálogo digital.
          </p>
        </section>
      </main>
    </>
  );
}
