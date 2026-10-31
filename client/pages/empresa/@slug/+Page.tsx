import type { JSX } from 'react';
import { useConfig } from 'vike-react/useConfig';
import type { PublicScheduleData } from '../../../src/interfaces/catalog.interface';
import { useData } from 'vike-react/useData';
import CompanyCatalogPage from '../../../src/pages/CompanyCatalogPage';
import CompanyCatalogTemplate from '../../../src/components/templates/CompanyCatalogTemplate/CompanyCatalogTemplate';

export default function Page(): JSX.Element {
  const { slug, business, status } = useData<PublicScheduleData>();

  const title =
    status === undefined
      ? 'Carregando catálogo | Tá Marcado'
      : status === 'ready' && business
        ? `${business.name} | Tá Marcado`
        : 'Catálogo não encontrado | Tá Marcado';

  const description =
    status === 'ready' && business
      ? `Conheça os serviços de ${business.name}.`
      : 'Confira os catálogos públicos disponíveis no Tá Marcado.';

  const config = useConfig();

  config({
    title,
    Head: (
      <>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        {business?.logoUrl && <meta property="og:image" content={business.logoUrl} />}
      </>
    ),
  });

  if (status && status !== 'ready')
    return <CompanyCatalogTemplate catalog={null} status={status} />;

  return <CompanyCatalogPage slug={slug} />;
}
