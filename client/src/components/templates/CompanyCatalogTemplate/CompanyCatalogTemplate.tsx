import { useEffect, useMemo, useRef, type JSX } from 'react';
import { formatBrl } from '../../../../../shared/domain/money.js';
import {
  hasValidActivePromotion,
  resolveProductPricing,
} from '../../../../../shared/domain/product-price.js';
import type {
  CompanyCatalog,
  PublicProductSummary,
} from '../../../interfaces/company.interface.js';
import { createCompanyPwaManifest } from '../../../services/pwa-manifest.service.js';
import Skeleton from '../../atoms/Skeleton/Skeleton.js';
import SkeletonCard from '../../molecules/SkeletonCard/SkeletonCard.js';
import PwaInstallPrompt from '../../organisms/PwaInstallPrompt/PwaInstallPrompt.js';

type CompanyCatalogTemplateProps = {
  catalog: CompanyCatalog | null;
  promotions?: PublicProductSummary[];
  status: 'loading' | 'error' | 'unavailable' | 'not-found' | 'ready';
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
};

export default function CompanyCatalogTemplate({
  catalog,
  promotions,
  status,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
}: Readonly<CompanyCatalogTemplateProps>): JSX.Element {
  const isLoading = useMemo<boolean>(() => status === 'loading', [status]);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const promotionalProducts = promotions ?? catalog?.promotions ?? [];
  const businessSlug = catalog?.business.slug;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || loadingMore || !onLoadMore) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onLoadMore();
      },
      { rootMargin: '300px' },
    );
    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [hasMore, loadingMore, onLoadMore, catalog?.products.length]);

  useEffect(() => {
    if (status !== 'ready' || !catalog) return;

    let manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    const addedManifestLink = manifestLink === null;
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      document.head.append(manifestLink);
    }

    const manifest = createCompanyPwaManifest(catalog.business, window.location.origin);
    const manifestUrl = URL.createObjectURL(
      new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' }),
    );
    const originalHref = manifestLink.getAttribute('href');
    const originalTitle = document.title;
    const metadata = [
      ['meta[name="apple-mobile-web-app-title"]', catalog.business.name],
      ['meta[name="description"]', `Agende serviços com ${catalog.business.name}.`],
      ['meta[property="og:title"]', `${catalog.business.name} | Tá Marcado`],
      ['meta[property="og:description"]', `Conheça os serviços de ${catalog.business.name}.`],
    ] as const;
    const originalMetadata = metadata.map(([selector]) => {
      const element = document.querySelector<HTMLMetaElement>(selector);
      return { element, content: element?.getAttribute('content') ?? null };
    });
    document.title = `${catalog.business.name} | Tá Marcado`;
    metadata.forEach(([selector, content]) => {
      document.querySelector<HTMLMetaElement>(selector)?.setAttribute('content', content);
    });
    manifestLink.href = manifestUrl;

    return () => {
      if (addedManifestLink) manifestLink.remove();
      else if (originalHref === null) manifestLink.removeAttribute('href');
      else manifestLink.setAttribute('href', originalHref);
      document.title = originalTitle;
      originalMetadata.forEach(({ element, content }) => {
        if (!element) return;
        if (content === null) element.removeAttribute('content');
        else element.setAttribute('content', content);
      });
      URL.revokeObjectURL(manifestUrl);
    };
  }, [catalog, status]);

  return (
    <>
      <div className="market-bg" aria-hidden="true" />
      {status === 'error' && (
        <main className="page market-page">
          <p role="alert" className="error state-card">
            Não foi possível carregar este catálogo.
          </p>
        </main>
      )}
      {status === 'unavailable' && (
        <main className="page market-page">
          <p role="status" className="state-card">
            Este catálogo está temporariamente indisponível. Tente novamente.
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
      {(isLoading || (status === 'ready' && catalog !== null)) && (
        <main className="page stack market-page catalog-page">
          {isLoading && (
            <p className="skeleton-status" role="status">
              Carregando catálogo...
            </p>
          )}
          <header className="company-hero">
            <div className="company-identity" aria-busy={isLoading}>
              {isLoading ? (
                <span className="company-logo catalog-loading-logo" aria-hidden="true" />
              ) : catalog?.business.logoUrl ? (
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
                {isLoading ? (
                  <Skeleton className="catalog-loading-title" />
                ) : (
                  catalog && <h1>{catalog.business.name}</h1>
                )}
                {isLoading ? (
                  <Skeleton className="catalog-loading-description" />
                ) : (
                  catalog?.business.description && <p>{catalog.business.description}</p>
                )}
              </div>
            </div>
            <span className="company-hero-note">Encontre seu próximo horário</span>
          </header>
          {businessSlug && promotionalProducts.some(hasValidActivePromotion) && (
            <section
              className="catalog-section promotions-section"
              aria-labelledby="promotions-heading"
            >
              <div className="section-heading">
                <div>
                  <h2 id="promotions-heading">Ofertas</h2>
                  <p className="promotions-description">
                    Preços especiais em serviços selecionados.
                  </p>
                </div>
              </div>
              <section className="promotion-grid" aria-label="Produtos em promoção">
                {promotionalProducts.filter(hasValidActivePromotion).map((product) => {
                  const variants = product.variantPrices?.length
                    ? product.variantPrices
                    : [undefined];
                  return (
                    <article className="promotion-card" key={product.id}>
                      <a
                        href={`/empresa/${encodeURIComponent(businessSlug)}/agendar/${encodeURIComponent(product.id)}`}
                        className="promotion-card-link"
                      >
                        <div className="promotion-image">
                          <img
                            src={product.defaultImages?.[0]?.downloadUrl ?? product.imageUrl}
                            alt={product.name}
                            loading="lazy"
                          />
                          <span className="promotion-badge">Em promoção</span>
                        </div>
                        <div className="promotion-body">
                          <h3>{product.name}</h3>
                          {product.description && (
                            <p className="service-description">{product.description}</p>
                          )}
                          <div className="promotion-prices">
                            {variants.map((variant) => {
                              const pricing = resolveProductPricing(
                                product,
                                variant?.selections ?? [],
                              );
                              if (!pricing?.promotionApplied) return null;
                              const variantLabel = variant?.selections
                                .map((selection) => {
                                  const attribute = product.customizationAttributes?.find(
                                    (item) => item.id === selection.attributeId,
                                  );
                                  const option = attribute?.options.find(
                                    (item) => item.id === selection.optionId,
                                  );
                                  return `${attribute?.label ?? 'Opção'}: ${option?.label ?? 'Indisponível'}`;
                                })
                                .join(' / ');
                              return (
                                <div
                                  className="promotion-price-row"
                                  key={
                                    variant?.selections
                                      .map(
                                        (selection) =>
                                          `${selection.attributeId}:${selection.optionId}`,
                                      )
                                      .join('|') ?? 'product-price'
                                  }
                                >
                                  {variantLabel && (
                                    <span className="promotion-variant-label">{variantLabel}</span>
                                  )}
                                  <span className="promotion-price-values">
                                    <s className="promotion-original-price">
                                      {formatBrl(pricing.originalPriceCents)}
                                    </s>
                                    <strong className="promotion-current-price">
                                      {formatBrl(pricing.effectivePriceCents)}
                                    </strong>
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                          <span className="store">
                            {product.durationMinutes} min · Escolher horário
                          </span>
                        </div>
                      </a>
                    </article>
                  );
                })}
              </section>
            </section>
          )}
          <section
            className="catalog-section"
            aria-labelledby="catalog-heading"
            aria-busy={isLoading}
          >
            <div className="section-heading">
              <div>
                <p className="eyebrow">ESCOLHA O QUE COMBINA COM VOCÊ</p>
                <h2 id="catalog-heading">Serviços disponíveis</h2>
              </div>
              {isLoading ? (
                <Skeleton className="catalog-loading-count" />
              ) : (
                catalog && (
                  <span className="catalog-count">
                    {catalog.products.length}
                    {hasMore ? '+' : ''} serviços
                  </span>
                )
              )}
            </div>
            {isLoading ? (
              <section
                className="showcase-grid catalog-grid"
                aria-label="Carregando serviços"
                aria-busy="true"
              >
                {Array.from({ length: 4 }, (_, index) => (
                  <div key={`catalog-skeleton-${index}`}>
                    <SkeletonCard variant="service" imagePlaceholder />
                  </div>
                ))}
              </section>
            ) : catalog ? (
              catalog.products.length === 0 ? (
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
                          <img
                            src={product.defaultImages?.[0]?.downloadUrl ?? product.imageUrl}
                            alt={product.name}
                            loading="lazy"
                          />
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
                  {hasMore && (
                    <div ref={sentinelRef} aria-hidden="true">
                      {loadingMore && <SkeletonCard variant="service" imagePlaceholder />}
                    </div>
                  )}
                </section>
              )
            ) : null}
          </section>
          <footer className="tamarcado-brand">
            <img src="/pwa-icon.svg" alt="" width="24" height="24" loading="lazy" />
            <span>Agendamentos online com Tá Marcado</span>
          </footer>
          {catalog && <PwaInstallPrompt businessName={catalog.business.name} />}
        </main>
      )}
    </>
  );
}
