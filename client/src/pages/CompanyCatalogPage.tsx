import { type JSX } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCompanyCatalog } from '../services/catalog.service';
import { companyCatalogQueryKey } from '../services/query-client';
import { createPublicContentMarkup } from '../services/public-content-markup';
import MarketBackground from '../components/atoms/MarketBackground';

export default function CompanyCatalogPage(): JSX.Element {
  const { slug = '' } = useParams();
  const catalogQuery = useQuery({
    queryKey: companyCatalogQueryKey(slug),
    queryFn: () => getCompanyCatalog(slug),
    enabled: Boolean(slug),
  });
  const catalog = catalogQuery.data;

  if (catalogQuery.isPending) {
    return (
      <>
        <MarketBackground />
        <main className="page market-page">
          <p className="loading-message" role="status">Carregando catálogo...</p>
        </main>
      </>
    );
  }

  if (catalogQuery.isError) {
    return (
      <>
        <MarketBackground />
        <main className="page market-page">
          <p role="alert" className="error state-card">Não foi possível carregar este catálogo.</p>
        </main>
      </>
    );
  }

  if (!catalog) {
    return (
      <>
        <MarketBackground />
        <main className="page market-page">
          <p role="status" className="state-card">Empresa não encontrada.</p>
        </main>
      </>
    );
  }

  return <div dangerouslySetInnerHTML={{ __html: createPublicContentMarkup(catalog) }} />;
}
