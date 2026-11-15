import type { AppRoute } from '../interfaces/route.interface';

export class RouteUtil {
  public static readonly homePath: string = '/';

  public static companyCatalogPath(slug: string): string {
    return `/empresa/${encodeURIComponent(slug)}`;
  }

  public static bookingPath(slug: string, productId: string): string {
    return `${this.companyCatalogPath(slug)}/agendar/${encodeURIComponent(productId)}`;
  }

  private static decodeSegment(segment: string): string | null {
    try {
      return decodeURIComponent(segment);
    } catch (error: unknown) {
      if (error instanceof URIError) return null;
      throw error;
    }
  }

  public static matchRoute(pathname: string): AppRoute {
    const segments = pathname.split('/').filter(Boolean);

    if (segments.length === 0) return { name: 'home' };

    if (segments[0] !== 'empresa' || !segments[1]) return { name: 'not-found' };

    const slug = this.decodeSegment(segments[1]);

    if (!slug) return { name: 'not-found' };

    if (segments.length === 2) return { name: 'catalog', slug };

    if (segments.length === 4 && segments[2] === 'agendar') {
      const productId = this.decodeSegment(segments[3]!);
      if (productId) return { name: 'booking', slug, productId };
    }

    return { name: 'not-found' };
  }
}
