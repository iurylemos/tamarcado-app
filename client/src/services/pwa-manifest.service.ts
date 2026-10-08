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

export function createCompanyPwaManifest(slug: string, origin: string): PwaManifest {
  if (!slug.trim()) throw new Error('A company slug is required to create its PWA manifest.');

  const startUrl = new URL(`/empresa/${encodeURIComponent(slug)}`, origin).toString();

  return {
    id: startUrl,
    name: 'Tá Marcado',
    short_name: 'Tá Marcado',
    description: 'Encontre empresas e agende serviços pelo Tá Marcado.',
    lang: 'pt-BR',
    theme_color: '#4f46e5',
    background_color: '#fff7ed',
    display: 'standalone',
    start_url: startUrl,
    scope: new URL('/', origin).toString(),
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
