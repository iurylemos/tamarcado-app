export type AppRoute =
  | { name: 'home' }
  | { name: 'catalog'; slug: string }
  | { name: 'booking'; slug: string; productId: string }
  | { name: 'not-found' };

export const homePath = '/';

export function companyCatalogPath(slug: string): string {
  return `/empresa/${encodeURIComponent(slug)}`;
}

export function bookingPath(slug: string, productId: string): string {
  return `${companyCatalogPath(slug)}/agendar/${encodeURIComponent(productId)}`;
}

function decodeSegment(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch (error: unknown) {
    if (error instanceof URIError) return null;
    throw error;
  }
}

export function matchRoute(pathname: string): AppRoute {
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) return { name: 'home' };
  if (segments[0] !== 'empresa' || !segments[1]) return { name: 'not-found' };

  const slug = decodeSegment(segments[1]);
  if (!slug) return { name: 'not-found' };
  if (segments.length === 2) return { name: 'catalog', slug };

  if (segments.length === 4 && segments[2] === 'agendar') {
    const productId = decodeSegment(segments[3]!);
    if (productId) return { name: 'booking', slug, productId };
  }

  return { name: 'not-found' };
}
