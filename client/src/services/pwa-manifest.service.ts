import { isValidBusinessSlug } from '../utils/business-slug.util.js';

export type PwaManifest = {
  id: string;
  name: string;
  short_name: string;
  description: string;
  lang: string;
  theme_color: string;
  background_color: string;
  display: 'standalone';
  start_url: string;
  scope: string;
  icons: Array<{
    src: string;
    sizes: string;
    type: string;
    purpose: string;
  }>;
};

export function createCompanyPwaManifest(
  business: { slug: string; name: string; description?: string },
  origin: string,
): PwaManifest {
  if (!isValidBusinessSlug(business.slug)) {
    throw new Error('A valid company slug is required to create its PWA manifest.');
  }

  const businessPath = `/empresa/${encodeURIComponent(business.slug)}/`;
  const startUrl = new URL(businessPath, origin).toString();

  return {
    id: startUrl,
    name: `${business.name} | Tá Marcado`,
    short_name: business.name,
    description: business.description ?? `Agende serviços com ${business.name}.`,
    lang: 'pt-BR',
    theme_color: '#4f46e5',
    background_color: '#fff7ed',
    display: 'standalone',
    start_url: startUrl,
    scope: new URL(businessPath, origin).toString(),
    icons: [
      {
        src: new URL('/pwa-icon.svg', origin).toString(),
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any maskable',
      },
    ],
  };
}
