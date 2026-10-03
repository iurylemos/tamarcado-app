import { useEffect, useState, type JSX } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatBrl } from '@shared/money';
import type { CompanyCatalog } from '../interfaces/company.interface';
import { getCompanyCatalog } from '../services/catalog.service';
import Card from '../components/atoms/Card';

export default function CompanyCatalogPage(): JSX.Element {
  const { slug = '' } = useParams();
  const [catalog, setCatalog] = useState<CompanyCatalog | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let current = true;

    setLoading(true);
    setError('');

    getCompanyCatalog(slug)
      .then((result) => {
        if (current) setCatalog(result);
      })
      .catch(() => {
        if (current) setError('Não foi possível carregar este catálogo.');
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <main className="page">
        <p role="status">Carregando catálogo...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="page">
        <p role="alert" className="error">
          {error}
        </p>
      </main>
    );
  }

  if (!catalog) {
    return (
      <main className="page">
        <p role="status">Empresa não encontrada.</p>
      </main>
    );
  }

  return (
    <main className="page stack">
      <Link to="/">← Todas as empresas</Link>

      <header className="stack">
        {catalog.business.logoUrl && <img src={catalog.business.logoUrl} alt="" width="120" />}
        <h1>{catalog.business.name}</h1>
        {catalog.business.description && <p>{catalog.business.description}</p>}
      </header>
      <h2>Serviços disponíveis</h2>

      {catalog.products.length === 0 ? (
        <p role="status">Esta empresa ainda não publicou serviços.</p>
      ) : (
        <section className="grid-cards" aria-label="Serviços">
          {catalog.products.map((product) => (
            <Card
              key={product.id}
              title={product.name}
              imageUrl={product.imageUrl}
              description={product.description}
              detail={`${formatBrl(product.priceCents)} · ${product.durationMinutes} min`}
              href={`/empresa/${catalog.business.slug}/agendar/${product.id}`}
              actionLabel="Escolher horário"
            />
          ))}
        </section>
      )}
    </main>
  );
}
