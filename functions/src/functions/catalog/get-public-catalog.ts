import { onCall } from 'firebase-functions/v2/https';
import { callableOptionsPublic } from '../../options/callable.option';
import { HttpsError } from 'firebase-functions/v2/https';
import {
  listPublicProductRecords,
  findPublicBusiness,
} from '../../services/public-catalog.service';

export const getPublicCatalog = onCall(callableOptionsPublic, async (request) => {
  const slug = request.data?.businessSlug;

  if (typeof slug !== 'string' || !slug.trim()) {
    throw new HttpsError('invalid-argument', 'Informe o endereço da empresa.');
  }

  const business = await findPublicBusiness(slug);
  const products = await listPublicProductRecords(business);

  return {
    business: {
      id: business.id,
      name: business.name,
      slug: business.slug,
      segment: business.segment,
      description: business.description,
      logoUrl: business.logoUrl,
    },
    products: products.map(
      ({
        id,
        name,
        description,
        imageUrl,
        customizationAttributes,
        defaultImages,
        imageGalleries,
        priceCents,
        durationMinutes,
      }) => ({
      id,
      name,
      description,
      imageUrl,
      ...(customizationAttributes ? { customizationAttributes } : {}),
      ...(defaultImages ? { defaultImages } : {}),
      ...(imageGalleries ? { imageGalleries } : {}),
      priceCents,
      durationMinutes,
      }),
    ),
  };
});
