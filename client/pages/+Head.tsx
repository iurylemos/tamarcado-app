import type { JSX } from 'react';

export function Head(): JSX.Element {
  return (
    <>
      <meta name="theme-color" content="#4f46e5" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content="Tá Marcado" />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Tá Marcado" />
      <meta name="twitter:card" content="summary_large_image" />
      <link rel="icon" type="image/svg+xml" href="/pwa-icon.svg" />
      <link rel="apple-touch-icon" href="/pwa-icon.svg" />
    </>
  );
}
