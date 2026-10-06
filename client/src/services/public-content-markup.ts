import type { CompanyCatalog } from '../interfaces/company.interface.js';

const formatPrice = (priceCents: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    priceCents / 100,
  );

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export function createPublicContentMarkup(catalog: CompanyCatalog): string {
  const { business, products } = catalog;
  const logo = business.logoUrl
    ? `<img class="company-logo" src="${escapeHtml(business.logoUrl)}" alt="${escapeHtml(business.name)}" />`
    : '<span class="company-logo company-logo-placeholder" aria-hidden="true">✦</span>';

  const productCards = products
    .map(
      (product) => `
        <div>
          <a class="product-card catalog-service-card" href="/empresa/${encodeURIComponent(business.slug)}/agendar/${encodeURIComponent(product.id)}">
            <div class="media">
              <img src="${escapeHtml(product.imageUrl)}" alt="${escapeHtml(product.name)}" loading="lazy" />
              <span class="price">${escapeHtml(formatPrice(product.priceCents))}</span>
            </div>
            <div class="body">
              <h3>${escapeHtml(product.name)}</h3>
              ${product.description ? `<p class="service-description">${escapeHtml(product.description)}</p>` : ''}
              <span class="store">${product.durationMinutes} min · Escolher horário →</span>
            </div>
          </a>
        </div>`,
    )
    .join('');

  return `
    <div class="market-bg" aria-hidden="true"></div>
    <main class="page stack market-page catalog-page">
      <a class="market-back-link" href="/">← Todas as empresas</a>
      <header class="company-hero">
        <div class="company-identity">
          ${logo}
          <div>
            <p class="eyebrow">CATÁLOGO DA EMPRESA</p>
            <h1>${escapeHtml(business.name)}</h1>
            ${business.description ? `<p>${escapeHtml(business.description)}</p>` : ''}
          </div>
        </div>
        <span class="company-hero-note">Encontre seu próximo horário</span>
      </header>
      <section class="catalog-section" aria-labelledby="catalog-heading">
        <div class="section-heading">
          <div>
            <p class="eyebrow">ESCOLHA O QUE COMBINA COM VOCÊ</p>
            <h2 id="catalog-heading">Serviços disponíveis</h2>
          </div>
          <span class="catalog-count">${products.length} serviços</span>
        </div>
        ${
          products.length === 0
            ? '<p role="status" class="state-card">Esta empresa ainda não publicou serviços.</p>'
            : `<section class="showcase-grid catalog-grid" aria-label="Serviços">${productCards}</section>`
        }
      </section>
    </main>`;
}
