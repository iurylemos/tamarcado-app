import { useEffect, useState, type JSX } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { formatBrl } from '@shared/money';
import type { CompanyCatalog } from '../interfaces/company.interface';
import { getCompanyCatalog } from '../services/catalog.service';
import MarketBackground from '../components/atoms/MarketBackground';
import { useAppLoading } from '../contexts/LoadingContext';

export default function CompanyCatalogPage(): JSX.Element {
  const { slug = '' } = useParams();
  const [catalog, setCatalog] = useState<CompanyCatalog | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const { runWithLoading } = useAppLoading();

  useEffect(() => {
    let current = true;

    setLoading(true);
    setError('');

    runWithLoading('Abrindo o catálogo...', () => getCompanyCatalog(slug))
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
      <>
        <MarketBackground />
        <main className="page market-page">
          <p className="loading-message" role="status">Carregando catálogo...</p>
        </main>
      </>
    );
  }

  if (error) {
    return (
      <>
        <MarketBackground />
        <main className="page market-page">
          <p role="alert" className="error state-card">{error}</p>
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

  return (
    <>
      <MarketBackground />
      <main className="page stack market-page catalog-page">
        <Link className="market-back-link" to="/">← Todas as empresas</Link>

        <motion.header
          className="company-hero"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="company-identity">
            {catalog.business.logoUrl ? (
              <img className="company-logo" src={catalog.business.logoUrl} alt="" />
            ) : (
              <span className="company-logo company-logo-placeholder" aria-hidden="true">✦</span>
            )}
            <div>
              <p className="eyebrow">CATÁLOGO DA EMPRESA</p>
              <h1>{catalog.business.name}</h1>
              {catalog.business.description && <p>{catalog.business.description}</p>}
            </div>
          </div>
          <span className="company-hero-note">Encontre seu próximo horário</span>
        </motion.header>

        <section className="catalog-section" aria-labelledby="catalog-heading">
          <div className="section-heading">
            <div>
              <p className="eyebrow">ESCOLHA O QUE COMBINA COM VOCÊ</p>
              <h2 id="catalog-heading">Serviços disponíveis</h2>
            </div>
            <span className="catalog-count">{catalog.products.length} serviços</span>
          </div>

          {catalog.products.length === 0 ? (
            <p role="status" className="state-card">Esta empresa ainda não publicou serviços.</p>
          ) : (
            <section className="showcase-grid catalog-grid" aria-label="Serviços">
              {catalog.products.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index, 8) * 0.04 }}
                  whileHover={{ y: -4 }}
                >
                  <Link
                    className="product-card catalog-service-card"
                    to={`/empresa/${catalog.business.slug}/agendar/${product.id}`}
                  >
                    <div className="media">
                      <img src={product.imageUrl} alt={product.name} loading="lazy" />
                      <span className="price">{formatBrl(product.priceCents)}</span>
                    </div>
                    <div className="body">
                      <h3>{product.name}</h3>
                      {product.description && <p className="service-description">{product.description}</p>}
                      <span className="store">{product.durationMinutes} min · Escolher horário →</span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </section>
          )}
        </section>
      </main>
    </>
  );
}
