import { useEffect, type JSX } from 'react';
import { formatBrl } from '../../../../../shared/domain/money.js';
import type { CompanyCatalog } from '../../../interfaces/company.interface.js';
import { createCompanyPwaManifest } from '../../../services/pwa-manifest.service.js';
import SkeletonCard from '../../molecules/SkeletonCard/SkeletonCard.js';

type CompanyCatalogTemplateProps = {
  catalog: CompanyCatalog | null;
  status: 'loading' | 'error' | 'not-found' | 'ready';
};

export default function CompanyCatalogTemplate({
  catalog,
  status,
}: Readonly<CompanyCatalogTemplateProps>): JSX.Element {
  useEffect(() => {
    if (status !== 'ready' || !catalog) return;

    let manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    const addedManifestLink = manifestLink === null;
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      document.head.append(manifestLink);
    }

    const manifest = createCompanyPwaManifest(catalog.business.slug, window.location.origin);
    const manifestUrl = URL.createObjectURL(
      new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' }),
    );
    const originalHref = manifestLink.getAttribute('href');
    manifestLink.href = manifestUrl;

    return () => {
      if (addedManifestLink) manifestLink.remove();
      else if (originalHref === null) manifestLink.removeAttribute('href');
      else manifestLink.setAttribute('href', originalHref);
      URL.revokeObjectURL(manifestUrl);
    };
  }, [catalog, status]);

  return (
    <>
      <div className="market-bg" aria-hidden="true" />
      {status === 'loading' && (
        <main className="page market-page">
          <p className="skeleton-status" role="status">
            Carregando catálogo...
          </p>
          <section className="showcase-grid catalog-grid" aria-label="Carregando serviços">
            {Array.from({ length: 4 }, (_, index) => (
              <SkeletonCard key={`catalog-skeleton-${index}`} variant="service" />
            ))}
          </section>
        </main>
      )}
      {status === 'error' && (
        <main className="page market-page">
          <p role="alert" className="error state-card">
            Não foi possível carregar este catálogo.
          </p>
        </main>
      )}
      {status === 'not-found' && (
        <main className="page market-page">
          <p role="status" className="state-card">
            Empresa não encontrada.
          </p>
        </main>
      )}
      {status === 'ready' && catalog && (
        <main className="page stack market-page catalog-page">
          <a className="market-back-link" href="/">
            ← Todas as empresas
          </a>
          <header className="company-hero">
            <div className="company-identity">
              {catalog.business.logoUrl ? (
                <img
                  className="company-logo"
                  src={catalog.business.logoUrl}
                  alt={catalog.business.name}
                />
              ) : (
                <span className="company-logo company-logo-placeholder" aria-hidden="true">
                  ✦
                </span>
              )}
              <div>
                <p className="eyebrow">CATÁLOGO DA EMPRESA</p>
                <h1>{catalog.business.name}</h1>
                {catalog.business.description && <p>{catalog.business.description}</p>}
              </div>
            </div>
            <span className="company-hero-note">Encontre seu próximo horário</span>
          </header>
          <section className="catalog-section" aria-labelledby="catalog-heading">
            <div className="section-heading">
              <div>
                <p className="eyebrow">ESCOLHA O QUE COMBINA COM VOCÊ</p>
                <h2 id="catalog-heading">Serviços disponíveis</h2>
              </div>
              <span className="catalog-count">{catalog.products.length} serviços</span>
            </div>
            {catalog.products.length === 0 ? (
              <p role="status" className="state-card">
                Esta empresa ainda não publicou serviços.
              </p>
            ) : (
              <section className="showcase-grid catalog-grid" aria-label="Serviços">
                {catalog.products.map((product) => (
                  <div key={product.id}>
                    <a
                      className="product-card catalog-service-card"
                      href={`/empresa/${encodeURIComponent(catalog.business.slug)}/agendar/${encodeURIComponent(product.id)}`}
                    >
                      <div className="media">
                        <img src={product.imageUrl} alt={product.name} loading="lazy" />
                        <span className="price">{formatBrl(product.priceCents)}</span>
                      </div>
                      <div className="body">
                        <h3>{product.name}</h3>
                        {product.description && (
                          <p className="service-description">{product.description}</p>
                        )}
                        <span className="store">
                          {product.durationMinutes} min · Escolher horário →
                        </span>
                      </div>
                    </a>
                  </div>
                ))}
              </section>
            )}
          </section>
          <footer className="tamarcado-brand">
            <img src="/pwa-icon.svg" alt="" width="24" height="24" loading="lazy" />
            <span>Agendamentos online com Tá Marcado</span>
          </footer>
        </main>
      )}
    </>
  );
}
