import type { JSX } from 'react';
import { useConfig } from 'vike-react/useConfig';
import type { PublicScheduleData } from '../../../src/interfaces/catalog.interface';
import { useData } from 'vike-react/useData';
import CompanyCatalogPage from '../../../src/pages/CompanyCatalogPage';

export default function Page(): JSX.Element {
  const { slug, catalog, status } = useData<PublicScheduleData>();

  const title =
    status === undefined
      ? 'Carregando catálogo | Tá Marcado'
      : status === 'ready' && catalog
        ? `${catalog.business.name} | Tá Marcado`
        : 'Catálogo não encontrado | Tá Marcado';

  const description =
    status === 'ready' && catalog
      ? `Conheça os serviços de ${catalog.business.name}.`
      : 'Confira os catálogos públicos disponíveis no Tá Marcado.';

  const config = useConfig();

  config({
    title,
    Head: (
      <>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        {catalog?.business.logoUrl && (
          <meta property="og:image" content={catalog.business.logoUrl} />
        )}
      </>
    ),
  });

  return <CompanyCatalogPage slug={slug} initialCatalog={catalog} initialStatus={status} />;
}
