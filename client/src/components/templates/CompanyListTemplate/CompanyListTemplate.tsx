import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type {
  CompanySegment,
  CompanySummary,
  CompanyTabs,
  ShowcaseProduct,
} from '../../../interfaces/company.interface';
import { formatBrl } from '@shared/money';
import MarketBackground from '../../atoms/MarketBackground';
import SkeletonCard from '../../molecules/SkeletonCard/SkeletonCard';

const segmentOptions: CompanySegment[] = [
  { value: 'beauty', label: 'Beleza' },
  { value: 'health', label: 'Saúde' },
  { value: 'fitness', label: 'Bem-estar' },
  { value: 'automotive', label: 'Automotivo' },
  { value: 'other', label: 'Outros' },
];

type CompanyListTemplateProps = {
  companies: CompanySummary[];
  products: ShowcaseProduct[];
  companyBySlug: Map<string, CompanySummary>;
  loading: boolean;
  error: boolean;
  segment: string;
  tab: CompanyTabs;
  search: string;
  onSegmentChange: (segment: CompanySegment['value'] | '') => void;
  onTabChange: (tab: CompanyTabs) => void;
  onSearchChange: (search: string) => void;
};

export default function CompanyListTemplate({
  companies,
  products,
  companyBySlug,
  loading,
  error,
  segment,
  tab,
  search,
  onSegmentChange,
  onTabChange,
  onSearchChange,
}: Readonly<CompanyListTemplateProps>): JSX.Element {
  const items = tab === 'products' ? products : companies;

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
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </header>

        <div className="chips" role="group" aria-label="Filtrar por segmento">
          <button
            type="button"
            className="chip"
            aria-pressed={segment === ''}
            onClick={() => onSegmentChange('')}
          >
            Todos
          </button>
          {segmentOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className="chip"
              aria-pressed={segment === option.value}
              onClick={() => onSegmentChange(option.value)}
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
            onClick={() => onTabChange('products')}
          >
            Produtos
          </button>
          <button
            type="button"
            role="tab"
            className="tab"
            aria-selected={tab === 'stores'}
            onClick={() => onTabChange('stores')}
          >
            Lojas
          </button>
        </div>

        {loading && (
          <>
            <p className="skeleton-status" role="status">
              Carregando...
            </p>
            <section
              className="showcase-grid"
              aria-label={`Carregando ${tab === 'products' ? 'produtos' : 'empresas'}`}
            >
              {Array.from({ length: 6 }, (_, index) => (
                <SkeletonCard
                  key={`discovery-skeleton-${index}`}
                  variant={tab === 'products' ? 'product' : 'store'}
                />
              ))}
            </section>
          </>
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
            {products.map((product, index) => (
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
            {companies.map((company, index) => (
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
