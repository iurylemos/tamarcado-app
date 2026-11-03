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
      ...(business.timezone ? { timezone: business.timezone } : {}),
    },
    products: products.map(
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
        promotionActive,
        promotionalPriceCents,
        estimatedDeliveryEnabled,
        estimatedDeliveryDays,
        durationMinutes,
      }) => ({
        id,
        name,
        description,
        imageUrl,
        ...(customizationAttributes ? { customizationAttributes } : {}),
        ...(variantPrices ? { variantPrices } : {}),
        ...(defaultImages ? { defaultImages } : {}),
        ...(imageGalleries ? { imageGalleries } : {}),
        priceCents,
        promotionActive,
        ...(promotionActive && promotionalPriceCents !== undefined
          ? { promotionalPriceCents }
          : {}),
        estimatedDeliveryEnabled,
        ...(estimatedDeliveryEnabled && estimatedDeliveryDays !== undefined
          ? { estimatedDeliveryDays }
          : {}),
        durationMinutes,
      }),
    ),
  };
});
