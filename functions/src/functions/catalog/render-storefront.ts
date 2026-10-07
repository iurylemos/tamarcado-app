import { findPublicBusiness, listPublicProductRecords } from '../../services/public-catalog.service';
import { onRequest, type Request } from 'firebase-functions/v2/https';
import type { Response } from 'firebase-functions/v1';
import { logger } from 'firebase-functions';
import { DomainError } from '../../../../shared/domain/errors';
import { renderPublicContent } from '../../../../client/src/entry-server.js';
import type {
  CompanyCatalog,
  CompanySummary,
  PublicProductSummary,
} from '../../../../client/src/interfaces/company.interface.js';

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const safeJson = (value: unknown): string =>
  JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (character) => {
    const escapes: Record<string, string> = {
      '<': '\\u003c',
      '>': '\\u003e',
      '&': '\\u0026',
      '\u2028': '\\u2028',
      '\u2029': '\\u2029',
    };
    return escapes[character] ?? character;
  });

export function renderStorefrontHtml(
  shellHtml: string,
  catalog: CompanyCatalog,
  origin: string,
): string {
  const canonical = `${origin}/empresa/${encodeURIComponent(catalog.business.slug)}`;
  const title = `${catalog.business.name} | Agende seu serviço`;
  const description = catalog.business.description || `Conheça os serviços de ${catalog.business.name} e agende online.`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: catalog.business.name,
    description,
    url: canonical,
    ...(catalog.business.logoUrl ? { image: catalog.business.logoUrl } : {}),
    makesOffer: catalog.products.map((product) => ({
      '@type': 'Offer',
      url: `${canonical}/agendar/${encodeURIComponent(product.id)}`,
      priceCurrency: 'BRL',
      price: (product.priceCents / 100).toFixed(2),
      itemOffered: {
        '@type': 'Service',
        name: product.name,
        ...(product.description ? { description: product.description } : {}),
      },
    })),
  };
  const metadata = [
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
    ...(catalog.business.logoUrl
      ? [`<meta property="og:image" content="${escapeHtml(catalog.business.logoUrl)}" />`]
      : []),
    `<meta name="twitter:card" content="${catalog.business.logoUrl ? 'summary_large_image' : 'summary'}" />`,
    `<script type="application/ld+json">${safeJson(structuredData)}</script>`,
  ].join('');
  const serializedCatalog = safeJson(catalog);

  return shellHtml
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`)
    .replace(/<meta\s+name=["']description["'][^>]*>/i, '')
    .replace(
      '</head>',
      `${metadata}</head>`,
    )
    .replace(
      '<div id="root"></div>',
      `<div id="root">${renderPublicContent(catalog)}</div><script>window.__TAMARCADO_SSR__={catalog:${serializedCatalog}};</script>`,
    );
}

export const renderStorefront = onRequest(
  async (request: Request, response: Response): Promise<void> => {
    try {
      const origin = `https://${request.hostname}`;
      const shell = await fetch(`${origin}/index.html`);

      if (!shell.ok) {
        response.status(502).send('Não foi possível carregar a página.');
        return;
      }

      const segments = request.path.split('/').filter(Boolean);
      const slug = decodeURIComponent(segments[1] ?? '');

      if (!slug) {
        response.status(400).send('Slug não fornecido.');
        return;
      }

      if (segments.length !== 2) {
        response.status(200).type('html').send(await shell.text());
        return;
      }

      const business = await findPublicBusiness(slug);
      const [productRecords, htmlText] = await Promise.all([
        listPublicProductRecords(business),
        shell.text(),
      ]);
      const publicBusiness: CompanySummary = {
        id: business.id,
        name: business.name,
        slug: business.slug,
        segment: business.segment,
        description: business.description,
        logoUrl: business.logoUrl,
      };
      const catalog: CompanyCatalog = {
        business: publicBusiness,
        products: productRecords.map(
          ({ id, name, description, imageUrl, priceCents, durationMinutes }): PublicProductSummary => ({
            id,
            name,
            description,
            imageUrl,
            priceCents,
            durationMinutes,
          }),
        ),
      };

      response
        .set('Cache-Control', 'public, max-age=60, s-maxage=300')
        .status(200)
        .type('html')
        .send(renderStorefrontHtml(htmlText, catalog, origin));
    } catch (error: unknown) {
      if (error instanceof DomainError && error.code === 'NOT_FOUND') {
        response.status(404).send('Empresa não encontrada.');
        return;
      }

      logger.error('Error rendering storefront for slug:', error);
      response.status(500).send('Erro interno do servidor.');
    }
  },
);
