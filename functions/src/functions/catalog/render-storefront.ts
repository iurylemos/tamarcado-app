import { logUnexpectedFailure } from '../../services/diagnostic-logging.service';
import { onRequest, type Request } from 'firebase-functions/v2/https';
import type { Response } from 'firebase-functions/v1';
import type {
  CompanySummary,
  PublicProductSummary,
} from '../../../../client/src/interfaces/company.interface';
import type { PublicCatalogStatus } from '../../interfaces/catalog.interface';
import { DomainError } from '../../../../shared/domain/errors';
import {
  findPublicBusiness,
  findPublicProductRecord,
  type PublicBusinessRecord,
} from '../../services/public-catalog.service';
import { renderPage } from 'vike/server';
import type { PublicProductRecord } from '../../interfaces/product.interface';

type PublicStorefrontData = {
  business: CompanySummary;
  product?: PublicProductSummary | null;
};

function toPublicBusiness(business: PublicBusinessRecord): CompanySummary {
  return {
    id: business.id,
    name: business.name,
    slug: business.slug,
    segment: business.segment,
    description: business.description,
    logoUrl: business.logoUrl,
  };
}

function toPublicProduct({
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
}: PublicProductRecord): PublicProductSummary {
  return {
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
  };
}

async function loadPublicStorefront(
  slug: string,
  productId?: string,
): Promise<PublicStorefrontData> {
  if (!productId) return { business: toPublicBusiness(await findPublicBusiness(slug)) };

  const [business, product] = await Promise.all([
    findPublicBusiness(slug),
    findPublicProductRecord(slug, productId),
  ]);

  return {
    business: toPublicBusiness(business),
    product: product && product.tenantId === business.tenantId ? toPublicProduct(product) : null,
  };
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
    let initialBusiness: CompanySummary | null = null;
    let initialProduct: PublicProductSummary | null = null;
    let initialCatalogStatus: PublicCatalogStatus | undefined;
    let statusCode: number | undefined;

    if (segments[0] === 'empresa') {
      const slug = segments[1] ? decodePathSegment(segments[1]) : null;

      const requestedProductId = segments[3] ? decodePathSegment(segments[3]) : null;

      if (!slug) {
        initialCatalogStatus = 'not-found';
        statusCode = 404;
      } else {
        try {
          const storefront = await loadPublicStorefront(
            slug,
            segments[2] === 'agendar' && requestedProductId ? requestedProductId : undefined,
          );
          initialBusiness = storefront.business;
          initialProduct = storefront.product ?? null;
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

      if (
        initialBusiness &&
        segments[2] === 'agendar' &&
        segments.length === 4 &&
        !initialProduct
      ) {
        initialCatalogStatus = 'not-found';
        statusCode = 404;
      }
    }

    try {
      const host = request.get('host') ?? request.hostname;
      const origin = `${request.protocol}://${host}`;

      const pageContext = await renderPage({
        urlOriginal: request.originalUrl || request.url || request.path,
        headersOriginal: request.headers,
        origin,
        ...(initialCatalogStatus ? { initialCatalogStatus, initialBusiness, initialProduct } : {}),
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
