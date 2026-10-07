import { useMemo, type JSX } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import type { BusinessSegment } from '@shared/interfaces/tenant.interface';
import { formatBrl } from '@shared/money';
import type {
  CompanySegment,
  CompanyTabs,
  ShowcaseProduct,
} from '../interfaces/company.interface';
import { listPublicCompanies } from '../services/company.service';
import { listPublicProducts } from '../services/product.service';
import {
  publicCompaniesQueryKey,
  publicProductsQueryKey,
} from '../services/query-client';
import MarketBackground from '../components/atoms/MarketBackground';
import { useCatalogFiltersStore } from '../stores/catalog-filters.store';

const segmentOptions: Array<CompanySegment> = [
  { value: 'beauty', label: 'Beleza' },
  { value: 'health', label: 'Saúde' },
  { value: 'fitness', label: 'Bem-estar' },
  { value: 'automotive', label: 'Automotivo' },
  { value: 'other', label: 'Outros' },
];

export default function CompanyListPage(): JSX.Element {
  const segment = useCatalogFiltersStore((state) => state.segment);
  const tab = useCatalogFiltersStore((state) => state.tab);
  const search = useCatalogFiltersStore((state) => state.search);
  const setSegment = useCatalogFiltersStore((state) => state.setSegment);
  const setTab = useCatalogFiltersStore((state) => state.setTab);
  const setSearch = useCatalogFiltersStore((state) => state.setSearch);
  const companiesQuery = useQuery({
    queryKey: publicCompaniesQueryKey(segment || undefined),
    queryFn: () => listPublicCompanies(segment || undefined),
  });
  const productsQuery = useQuery({
    queryKey: publicProductsQueryKey,
    queryFn: listPublicProducts,
  });
  const companies = companiesQuery.data ?? [];
  const products = productsQuery.data ?? [];
  const loading = companiesQuery.isPending || productsQuery.isPending;
  const error = companiesQuery.isError || productsQuery.isError;

  const term = search.trim().toLowerCase();

  const companyBySlug = useMemo(
    () => new Map(companies.map((company) => [company.slug, company])),
    [companies],
  );

  const visibleCompanies = companies.filter((company) => company.name.toLowerCase().includes(term));
  const visibleProducts = products.filter((product) => {
    const store = companyBySlug.get(product.businessSlug);
    if (segment && !store) return false;
    return (
      product.name.toLowerCase().includes(term) ||
      (store?.name.toLowerCase().includes(term) ?? false)
    );
  });

  const items = tab === 'products' ? visibleProducts : visibleCompanies;

  return (
    <>
      <MarketBackground />
      <main className="page stack market-page">
        <header className="market-hero">
          <h1>Agende o que você precisa, perto de você</h1>
          <p>Serviços e lojas com horário marcado, sem espera.</p>
          <input
            className="market-search"
            type="search"
            aria-label="Buscar"
            placeholder="Buscar serviço ou loja"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </header>

        <div className="chips" role="group" aria-label="Filtrar por segmento">
          <button
            type="button"
            className="chip"
            aria-pressed={segment === ''}
            onClick={() => setSegment('')}
          >
            Todos
          </button>
          {segmentOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className="chip"
              aria-pressed={segment === option.value}
              onClick={() => setSegment(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="tabs" role="tablist">
          <button
            type="button"
            role="tab"
            className="tab"
            aria-selected={tab === 'products'}
            onClick={() => setTab('products')}
          >
            Produtos
          </button>
          <button
            type="button"
            role="tab"
            className="tab"
            aria-selected={tab === 'stores'}
            onClick={() => setTab('stores')}
          >
            Lojas
          </button>
        </div>

        {loading && (
          <p className="loading-message" role="status">
            Carregando...
          </p>
        )}

        {error && (
          <p role="alert" className="error">
            Não foi possível carregar a vitrine. Tente novamente.
          </p>
        )}

        {!loading && !error && items.length === 0 && (
          <p role="status">
            {tab === 'products'
              ? 'Nenhum produto encontrado.'
              : 'Nenhuma empresa encontrada neste segmento.'}
          </p>
        )}

        {!loading && !error && items.length > 0 && tab === 'products' && (
          <section className="showcase-grid" aria-label="Produtos">
            {visibleProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index, 8) * 0.04 }}
                whileHover={{ y: -4 }}
              >
                <Link
                  className="product-card"
                  to={`/empresa/${product.businessSlug}/agendar/${product.id}`}
                >
                  <div className="media">
                    <img src={product.imageUrl} alt={product.name} loading="lazy" />
                    <span className="price">{formatBrl(product.priceCents)}</span>
                  </div>
                  <div className="body">
                    <h3>{product.name}</h3>
                    <span className="store">
                      🏪 {companyBySlug.get(product.businessSlug)?.name ?? product.businessSlug}
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </section>
        )}

        {!loading && !error && items.length > 0 && tab === 'stores' && (
          <section className="showcase-grid" aria-label="Empresas">
            {visibleCompanies.map((company, index) => (
              <motion.div
                key={company.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index, 8) * 0.04 }}
                whileHover={{ y: -4 }}
              >
                <Link className="product-card store-card" to={`/empresa/${company.slug}`}>
                  <div className="media">
                    {company.logoUrl ? (
                      <img src={company.logoUrl} alt="" loading="lazy" />
                    ) : (
                      <span
                        aria-hidden="true"
                        style={{
                          fontSize: '3rem',
                          display: 'grid',
                          placeItems: 'center',
                          height: '100%',
                        }}
                      >
                        🏪
                      </span>
                    )}
                  </div>
                  <div className="body">
                    <h3>{company.name}</h3>
                    <span className="store">
                      {segmentOptions.find((option) => option.value === company.segment)?.label}
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </section>
        )}
      </main>
    </>
  );
}
