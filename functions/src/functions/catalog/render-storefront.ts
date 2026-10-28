import { logUnexpectedFailure } from '../../services/diagnostic-logging.service';
import { onRequest, type Request } from 'firebase-functions/v2/https';
import type { Response } from 'firebase-functions/v1';
import { DomainError } from '../../../../shared/domain/errors';
import {
  findPublicBusiness,
  listPublicProductRecords,
} from '../../services/public-catalog.service';
import type {
  CompanyCatalog,
  CompanySummary,
  PublicProductSummary,
} from '../../../../client/src/interfaces/company.interface';
import { renderPage } from 'vike/server';

type PublicCatalogStatus = 'ready' | 'not-found' | 'unavailable' | 'error';

async function loadPublicCatalog(slug: string): Promise<CompanyCatalog> {
  const business = await findPublicBusiness(slug);
  const productRecords = await listPublicProductRecords(business);

  const publicBusiness: CompanySummary = {
    id: business.id,
    name: business.name,
    slug: business.slug,
    segment: business.segment,
    description: business.description,
    logoUrl: business.logoUrl,
  };

  const products = productRecords.map(
    ({
      id,
      name,
      description,
      imageUrl,
      customizationAttributes,
      variantPrices,
      defaultImages,
      imageGalleries,
      priceCents,
      durationMinutes,
    }): PublicProductSummary => ({
      id,
      name,
      description,
      imageUrl,
      ...(customizationAttributes ? { customizationAttributes } : {}),
      ...(variantPrices ? { variantPrices } : {}),
      ...(defaultImages ? { defaultImages } : {}),
      ...(imageGalleries ? { imageGalleries } : {}),
      priceCents,
      durationMinutes,
    }),
  );

  return { business: publicBusiness, products };
}

function isUnavailableError(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('code' in error)) return false;
  return (
    error.code === 'unavailable' ||
    error.code === 'firestore/unavailable' ||
    error.code === 'functions/unavailable'
  );
}

function decodePathSegment(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch (error: unknown) {
    if (error instanceof URIError) return null;
    throw error;
  }
}

export const renderStorefront = onRequest(
  async (request: Request, response: Response): Promise<void> => {
    const segments = request.path.split('/').filter(Boolean);
    let initialCatalog: CompanyCatalog | null = null;
    let initialCatalogStatus: PublicCatalogStatus | undefined;
    let statusCode: number | undefined;

    if (segments[0] === 'empresa') {
      const slug = segments[1] ? decodePathSegment(segments[1]) : null;

      if (!slug) {
        initialCatalogStatus = 'not-found';
        statusCode = 404;
      } else {
        try {
          initialCatalog = await loadPublicCatalog(slug);
          initialCatalogStatus = 'ready';
        } catch (error: unknown) {
          if (error instanceof DomainError && error.code === 'NOT_FOUND') {
            initialCatalogStatus = 'not-found';
            statusCode = 404;
          } else {
            initialCatalogStatus = isUnavailableError(error) ? 'unavailable' : 'error';
            statusCode = initialCatalogStatus === 'unavailable' ? 503 : 500;
            logUnexpectedFailure(
              {
                functionName: 'renderStorefront',
                operation: 'storefront_render',
                stage: 'render',
              },
              error,
            );
          }
        }
      }

      const requestedProductId = segments[3] ? decodePathSegment(segments[3]) : null;

      if (
        initialCatalog &&
        segments.length === 4 &&
        segments[2] === 'agendar' &&
        (!requestedProductId ||
          !initialCatalog.products.some((product) => product.id === requestedProductId))
      ) {
        statusCode = 404;
      }
    }

    try {
      const host = request.get('host') ?? request.hostname;
      const origin = `${request.protocol}://${host}`;
      const pageContext = await renderPage({
        urlOriginal: request.originalUrl || request.url || request.path,
        headersOriginal: { 'user-agent': request.get('user-agent') ?? '' },
        origin,
        ...(initialCatalogStatus ? { initialCatalogStatus, initialCatalog } : {}),
      });

      if (!pageContext.httpResponse) {
        throw new Error('Vike did not provide an HTTP response for the requested route.');
      }

      for (const [name, value] of pageContext.httpResponse.headers) {
        response.set(name, value);
      }

      response
        .set(
          'Cache-Control',
          statusCode && statusCode >= 400 ? 'no-store' : 'public, max-age=60, s-maxage=300',
        )
        .status(statusCode ?? pageContext.httpResponse.statusCode);

      pageContext.httpResponse.pipe(response);
    } catch (error: unknown) {
      logUnexpectedFailure(
        { functionName: 'renderStorefront', operation: 'storefront_render', stage: 'render' },
        error,
      );

      response.status(500).type('text/plain').send('Erro interno do servidor.');
    }
  },
);
