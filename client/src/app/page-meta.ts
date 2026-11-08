import type { PageData } from './page-data';
import { SiteUtil } from '../utils/site.util';

export type PageMeta = {
  title: string;
  description: string;
  canonicalUrl?: string;
  imageUrl?: string;
};

function getPublicSiteUrl(): URL {
  const configuredUrl = import.meta.env.VITE_PUBLIC_SITE_URL?.trim();
  if (!configuredUrl) return new URL(SiteUtil.fallbackUrl);

  let url: URL;
  try {
    url = new URL(configuredUrl);
  } catch {
    throw new Error('VITE_PUBLIC_SITE_URL must be an absolute HTTP or HTTPS URL.');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('VITE_PUBLIC_SITE_URL must be an absolute HTTP or HTTPS URL.');
  }

  return url;
}

function canonicalUrl(pathname: string): string {
  return new URL(pathname, getPublicSiteUrl()).toString();
}

function safeImageUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export function resolvePageMeta(page: PageData): PageMeta {
  if (page.name === 'home') {
    return {
      title: `${SiteUtil.brand} | Catálogos e agendamentos`,
      description: 'Acesse o catálogo público do seu negócio e agende serviços online.',
      canonicalUrl: canonicalUrl('/'),
    };
  }

  if (page.name === 'catalog') {
    const { business, slug, status } = page;
    const canonical = canonicalUrl(`/empresa/${encodeURIComponent(slug)}`);

    if (status === undefined) {
      return {
        title: `Carregando catálogo | ${SiteUtil.brand}`,
        description: 'Confira os catálogos públicos disponíveis no Tá Marcado.',
        canonicalUrl: canonical,
      };
    }

    if (status === 'ready' && business) {
      const imageUrl = safeImageUrl(business.logoUrl);
      return {
        title: `${business.name} | ${SiteUtil.brand}`,
        description: business.description || `Conheça os serviços de ${business.name}.`,
        canonicalUrl: canonical,
        ...(imageUrl ? { imageUrl } : {}),
      };
    }

    return {
      title: `Catálogo não encontrado | ${SiteUtil.brand}`,
      description: 'Confira os catálogos públicos disponíveis no Tá Marcado.',
      canonicalUrl: canonical,
    };
  }

  if (page.name === 'booking') {
    const { business, product, slug, productId, status } = page;
    const canonical = canonicalUrl(
      `/empresa/${encodeURIComponent(slug)}/agendar/${encodeURIComponent(productId)}`,
    );

    if (status === undefined) {
      return {
        title: `Carregando agendamento | ${SiteUtil.brand}`,
        description: 'Carregando os dados do agendamento.',
        canonicalUrl: canonical,
      };
    }

    if (product && business) {
      const imageUrl = safeImageUrl(business.logoUrl);
      return {
        title: `Agende ${product.name} | ${business.name} | ${SiteUtil.brand}`,
        description: `Agende ${product.name} em ${business.name} pelo ${SiteUtil.brand}.`,
        canonicalUrl: canonical,
        ...(imageUrl ? { imageUrl } : {}),
      };
    }

    return {
      title: `Agendamento não encontrado | ${SiteUtil.brand}`,
      description: 'O serviço solicitado não está disponível neste catálogo.',
      canonicalUrl: canonical,
    };
  }

  return {
    title: `Página não encontrada | ${SiteUtil.brand}`,
    description: 'Esta página não existe.',
  };
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function renderPageMetaTags({
  description,
  title,
  canonicalUrl: canonical,
  imageUrl,
}: PageMeta): string {
  return [
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    ...(canonical
      ? [
          `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
          `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
        ]
      : []),
    ...(imageUrl ? [`<meta property="og:image" content="${escapeHtml(imageUrl)}" />`] : []),
  ].join('\n    ');
}

function updateMetaTag(
  key: 'name' | 'property',
  value: string,
  content: string | undefined,
): () => void {
  const selector = `meta[${key}="${value}"]`;
  const existing = document.querySelector<HTMLMetaElement>(selector);
  const previousContent = existing?.getAttribute('content') ?? null;
  const element = existing ?? (content !== undefined ? document.createElement('meta') : null);

  if (content !== undefined && element) {
    element.setAttribute(key, value);
    element.setAttribute('content', content);
    if (!existing) document.head.append(element);
  } else {
    existing?.remove();
  }

  return () => {
    if (!existing) {
      element?.remove();
    } else {
      if (previousContent === null) existing.removeAttribute('content');
      else existing.setAttribute('content', previousContent);
      if (!existing.isConnected) document.head.append(existing);
    }
  };
}

function updateCanonicalLink(url: string | undefined): () => void {
  const selector = 'link[rel="canonical"]';
  const existing = document.querySelector<HTMLLinkElement>(selector);
  const previousHref = existing?.getAttribute('href') ?? null;
  const element = existing ?? (url ? document.createElement('link') : null);

  if (url && element) {
    element.rel = 'canonical';
    element.href = url;
    if (!existing) document.head.append(element);
  } else {
    existing?.remove();
  }

  return () => {
    if (!existing) {
      element?.remove();
    } else {
      if (previousHref === null) existing.removeAttribute('href');
      else existing.href = previousHref;
      if (!existing.isConnected) document.head.append(existing);
    }
  };
}

export function updatePageMeta(meta: PageMeta): () => void {
  const previousTitle = document.title;
  const restoreMeta = [
    updateMetaTag('name', 'description', meta.description),
    updateMetaTag('property', 'og:title', meta.title),
    updateMetaTag('property', 'og:description', meta.description),
    updateMetaTag('property', 'og:url', meta.canonicalUrl),
    updateMetaTag('property', 'og:image', safeImageUrl(meta.imageUrl)),
    updateCanonicalLink(meta.canonicalUrl),
  ];
  document.title = meta.title;

  return () => {
    document.title = previousTitle;
    restoreMeta.reverse().forEach((restore) => restore());
  };
}
