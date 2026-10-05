import { findPublicBusiness } from '../../services/public-catalog.service';
import { onRequest, type Request } from 'firebase-functions/v2/https';
import type { Response } from 'firebase-functions/v1';
import { logger } from 'firebase-functions';

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const renderStorefront = onRequest(
  async (request: Request, response: Response): Promise<void> => {
    try {
      const origin = `https://${request.hostname}`;
      const shell = await fetch(`${origin}/index.html`);

      if (!shell.ok) {
        response.status(502).send('Não foi possível carregar a página.');
        return;
      }

      const slug = decodeURIComponent(request.path.split('/').filter(Boolean)[1] ?? '');

      if (!slug) {
        response.status(400).send('Slug não fornecido.');
        return;
      }

      const business = await findPublicBusiness(slug);
      const title = escapeHtml(String(business.name ?? 'Tá Marcado'));
      const description = escapeHtml(String(business.description ?? `Agende com ${business.name}`));
      const image = business.logoUrl
        ? `<meta property="og:image" content="${escapeHtml(String(business.logoUrl))}" />`
        : '';
      const meta = `<meta property="og:title" content="${title}" /><meta property="og:description" content="${description}" />${image}`;
      const htmlText = await shell.text();
      const html = htmlText
        .replace(/<title>.*?<\/title>/s, `<title>${title}</title>`)
        .replace('</head>', `${meta}</head>`);

      response
        .set('Cache-Control', 'public, max-age=60, s-maxage=300')
        .status(200)
        .type('html')
        .send(html);
    } catch (error: unknown) {
      logger.error('Error rendering storefront for slug:', error);
      response.status(500).send('Erro interno do servidor.');
    }
  },
);
