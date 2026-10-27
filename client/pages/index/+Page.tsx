import type { JSX } from 'react';
import { useConfig } from 'vike-react/useConfig';
import HomePage from '../../src/pages/HomePage';

export default function Page(): JSX.Element {
  const config = useConfig();

  config({
    title: 'Tá Marcado | Catálogos e agendamentos',
    Head: (
      <>
        <meta
          name="description"
          content="Acesse o catálogo público do seu negócio e agende serviços online."
        />
        <meta property="og:title" content="Tá Marcado | Catálogos e agendamentos" />
        <meta
          property="og:description"
          content="Acesse o catálogo público do seu negócio e agende serviços online."
        />
      </>
    ),
  });

  return <HomePage />;
}
