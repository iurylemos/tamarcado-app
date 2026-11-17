import { Fragment, useEffect, useMemo, useRef, type JSX } from 'react';
import { LazyMotion, MotionConfig, domAnimation, m } from 'framer-motion';
import { Link } from 'react-router-dom';
import { formatBrl } from '../../../../../shared/domain/money.js';
import {
  hasValidActivePromotion,
  resolveProductPricing,
} from '../../../../../shared/domain/product-price.js';
import type {
  CompanyCatalog,
  PublicProductSummary,
} from '../../../interfaces/company.interface.js';
import { resolvePageMeta, updatePageMeta } from '../../../app/page-meta.js';
import { CatalogUtil } from '../../../utils/catalog.util.js';
import { CatalogImageUtil } from '../../../utils/catalog-image.util.js';
import { RouteUtil } from '../../../utils/route.util.js';
import Skeleton from '../../atoms/Skeleton/Skeleton.js';
import SkeletonCard from '../../molecules/SkeletonCard/SkeletonCard.js';
import PwaInstallPrompt from '../../organisms/PwaInstallPrompt/PwaInstallPrompt.js';
import { PwaManifestService } from '../../../services/pwa-manifest.service.js';

type CatalogTemplateData = {
  isBusinessLoading: boolean;
  businessSlug: string | undefined;
  activePromotions: PublicProductSummary[];
  isLoading: boolean;
};

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
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const { isBusinessLoading, businessSlug, activePromotions, isLoading } =
    useMemo<CatalogTemplateData>(
      () => ({
        isLoading: status === 'loading',
        isBusinessLoading: status === 'loading' && catalog === null,
        businessSlug: catalog?.business.slug,
        activePromotions: (promotions ?? catalog?.promotions ?? []).filter(hasValidActivePromotion),
      }),
      [catalog, status, promotions],
    );

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
  }, [hasMore, loadingMore, onLoadMore, catalog]);

  useEffect(() => {
    if (status !== 'ready' || !catalog) return;

    let manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    const addedManifestLink = manifestLink === null;
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      document.head.append(manifestLink);
    }

    const manifest = PwaManifestService.createCompanyPwaManifest(
      catalog.business,
      window.location.origin,
    );
    const manifestUrl = URL.createObjectURL(
      new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' }),
    );
    const originalHref = manifestLink.getAttribute('href');
    const appleTitle = document.querySelector<HTMLMetaElement>(
      'meta[name="apple-mobile-web-app-title"]',
    );
    const originalAppleTitle = appleTitle?.getAttribute('content') ?? null;
    const restorePageMeta = updatePageMeta(
      resolvePageMeta({
        name: 'catalog',
        slug: catalog.business.slug,
        business: catalog.business,
        status: 'ready',
      }),
    );
    appleTitle?.setAttribute('content', catalog.business.name);
    manifestLink.href = manifestUrl;

    return () => {
      if (addedManifestLink) manifestLink.remove();
      else if (originalHref === null) manifestLink.removeAttribute('href');
      else manifestLink.setAttribute('href', originalHref);
      restorePageMeta();
      if (appleTitle && originalAppleTitle === null) appleTitle.removeAttribute('content');
      else if (appleTitle && originalAppleTitle !== null)
        appleTitle.setAttribute('content', originalAppleTitle);
      URL.revokeObjectURL(manifestUrl);
    };
  }, [catalog, status]);

  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation}>
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
                {isBusinessLoading ? (
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
                  {isBusinessLoading ? (
                    <Skeleton className="catalog-loading-title" />
                  ) : (
                    catalog && <h1>{catalog.business.name}</h1>
                  )}
                  {isBusinessLoading ? (
                    <Skeleton className="catalog-loading-description" />
                  ) : (
                    catalog?.business.description && <p>{catalog.business.description}</p>
                  )}
                </div>
              </div>
              <span className="company-hero-note">Encontre seu próximo horário</span>
            </header>
            {!isLoading && businessSlug && activePromotions.length > 0 && (
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
                  {activePromotions.map((product, index) => {
                    const variants = product.variantPrices?.length
                      ? product.variantPrices
                      : [undefined];
                    const image = product.defaultImages?.[0]?.downloadUrl ?? product.imageUrl;

                    return (
                      <m.article
                        className="promotion-card"
                        key={product.id}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Link
                          to={RouteUtil.bookingPath(businessSlug, product.id)}
                          className="promotion-card-link"
                        >
                          <div className="promotion-image">
                            <img
                              src={image}
                              {...CatalogImageUtil.responsive(
                                image,
                                '(min-width: 70rem) 25rem, (min-width: 640px) 36vw, calc(100vw - 3rem)',
                              )}
                              alt={product.name}
                              width="1600"
                              height="1100"
                              loading={index === 0 ? 'eager' : 'lazy'}
                              fetchPriority={index === 0 ? 'high' : 'auto'}
                              decoding="async"
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

                                const variantLabel = variant?.selections.map((selection, index) => {
                                  const attribute = product.customizationAttributes?.find(
                                    (item) => item.id === selection.attributeId,
                                  );

                                  const option = attribute?.options.find(
                                    (item) => item.id === selection.optionId,
                                  );

                                  return (
                                    <Fragment
                                      key={`${selection.attributeId}:${selection.optionId}`}
                                    >
                                      {index > 0 && ' / '}
                                      {attribute?.label ?? 'Opção'}:{' '}
                                      <b>{option?.label ?? 'Indisponível'}</b>
                                    </Fragment>
                                  );
                                });

                                const variantKey =
                                  variant?.selections
                                    .map(
                                      (selection) =>
                                        `${selection.attributeId}:${selection.optionId}`,
                                    )
                                    .join('|') ?? 'product-price';

                                return (
                                  <div className="promotion-price-row" key={variantKey}>
                                    {variantLabel && variantLabel.length > 0 && (
                                      <span className="promotion-variant-label">
                                        {variantLabel}
                                      </span>
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
                            <span className="store font-bold">
                              {CatalogUtil.serviceScheduleLabel(product)}
                            </span>
                          </div>
                        </Link>
                      </m.article>
                    );
                  })}
                </section>
              </section>
            )}
            {isLoading ? (
              <section
                key="catalog-loading"
                className="catalog-section"
                aria-label="Carregando serviços"
                aria-busy="true"
              >
                <div className="showcase-grid catalog-grid">
                  {Array.from({ length: 4 }, (_, index) => (
                    <div key={`catalog-skeleton-${index}`}>
                      <SkeletonCard variant="service" imagePlaceholder />
                    </div>
                  ))}
                </div>
              </section>
            ) : (
              <section
                key="catalog-ready"
                className="catalog-section"
                aria-labelledby="catalog-heading"
              >
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">ESCOLHA O QUE COMBINA COM VOCÊ</p>
                    <h2 id="catalog-heading">Serviços disponíveis</h2>
                  </div>
                  {catalog && (
                    <span className="catalog-count">
                      {catalog.products.length}
                      {hasMore ? '+' : ''} serviços
                    </span>
                  )}
                </div>
                {catalog &&
                  (catalog.products.length === 0 ? (
                    <p role="status" className="state-card">
                      Esta empresa ainda não publicou serviços.
                    </p>
                  ) : (
                    <section className="showcase-grid catalog-grid" aria-label="Serviços">
                      {catalog.products.map((product, index) => {
                        const isPriorityImage = index === 0 && activePromotions.length === 0;

                        const srcCurrentImage =
                          product.defaultImages?.[0]?.downloadUrl ?? product.imageUrl;

                        return (
                          <div
                            key={product.id}
                            className="rise-in"
                            style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
                          >
                            <m.div whileTap={{ scale: 0.97 }}>
                              <Link
                                className="product-card catalog-service-card"
                                to={RouteUtil.bookingPath(catalog.business.slug, product.id)}
                              >
                                <div className="media">
                                  <img
                                    src={srcCurrentImage}
                                    {...CatalogImageUtil.responsive(
                                      srcCurrentImage,
                                      '(min-width: 70rem) 260px, (min-width: 960px) 25vw, (min-width: 640px) 33vw, 50vw',
                                    )}
                                    alt={product.name}
                                    width="400"
                                    height="500"
                                    loading={isPriorityImage ? 'eager' : 'lazy'}
                                    fetchPriority={isPriorityImage ? 'high' : 'auto'}
                                    decoding="async"
                                  />
                                  <span className="price">{formatBrl(product.priceCents)}</span>
                                </div>
                                <div className="body">
                                  <h3>{product.name}</h3>
                                  {product.description && (
                                    <p className="service-description">{product.description}</p>
                                  )}
                                  <span className="store">
                                    {CatalogUtil.serviceScheduleLabel(product)}
                                    {product.estimatedDeliveryEnabled
                                      ? ' · Solicitar serviço →'
                                      : ' →'}
                                  </span>
                                </div>
                              </Link>
                            </m.div>
                          </div>
                        );
                      })}
                      {hasMore && (
                        <div ref={sentinelRef} aria-hidden="true">
                          {loadingMore && <SkeletonCard variant="service" imagePlaceholder />}
                        </div>
                      )}
                    </section>
                  ))}
              </section>
            )}
            {!isLoading && (
              <footer className="tamarcado-brand">
                <img src="/pwa-icon.svg" alt="" width="24" height="24" loading="lazy" />
                <span>Agendamentos online com Tá Marcado</span>
              </footer>
            )}
            {catalog && <PwaInstallPrompt businessName={catalog.business.name} />}
          </main>
        )}
      </LazyMotion>
    </MotionConfig>
  );
}
