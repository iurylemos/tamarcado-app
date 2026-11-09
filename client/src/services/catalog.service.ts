import type {
  CompanyCatalog,
  CompanySummary,
  PublicProductSummary,
} from '../interfaces/company.interface';
import type {
  ProductCustomizationSelection,
  ProductImageGallery,
  ProductImage,
  ProductVariantPrice,
} from '@shared/interfaces/product.interface';
import { hasValidActivePromotion } from '@shared/product-price';
import { isValidBusinessSlug } from '../utils/business-slug.util';
import {
  collection,
  documentId,
  getDocsFromServer,
  limit,
  orderBy,
  query,
  QueryDocumentSnapshot,
  QuerySnapshot,
  startAfter,
  where,
  type DocumentData,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from '../config/firebase.config';
import { ColorUtil } from '../utils/color.util';

export type CompanyCatalogOptions = {
  productId?: string;
  includeGalleries?: boolean;
  pageSize?: number;
  after?: Pick<PublicProductSummary, 'id' | 'name'>;
};

type GallerySnapshot = QuerySnapshot<DocumentData, DocumentData> | { docs: never[] };

function summarizeProduct(
  snapshot: QueryDocumentSnapshot<DocumentData, DocumentData>,
  galleries: GallerySnapshot,
  includeGalleries?: boolean,
): PublicProductSummary {
  const data = snapshot.data();
  const promotionActive = data.promotionActive === true;
  const hasCustomizationAttributes =
    Array.isArray(data.customizationAttributes) && data.customizationAttributes.length > 0;
  const validEstimatedDeliveryDays = (value: unknown): value is number =>
    typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
  const estimatedDeliveryEnabled =
    data.estimatedDeliveryEnabled === true &&
    (hasCustomizationAttributes
      ? Array.isArray(data.variantPrices) &&
        data.variantPrices.length > 0 &&
        data.variantPrices.every((variantPrice: ProductVariantPrice) =>
          validEstimatedDeliveryDays(variantPrice.estimatedDeliveryDays),
        )
      : validEstimatedDeliveryDays(data.estimatedDeliveryDays));

  const publicGalleries = galleries.docs.map(summarizeProductGallery);

  const variantPrices = Array.isArray(data.variantPrices)
    ? (data.variantPrices as ProductVariantPrice[]).map((variantPrice) => {
        const {
          promotionalPriceCents: variantPromotionPrice,
          estimatedDeliveryDays: variantEstimatedDeliveryDays,
          ...originalValues
        } = variantPrice;
        return {
          ...originalValues,
          ...(promotionActive && variantPromotionPrice !== undefined
            ? { promotionalPriceCents: variantPromotionPrice }
            : {}),
          ...(estimatedDeliveryEnabled && validEstimatedDeliveryDays(variantEstimatedDeliveryDays)
            ? { estimatedDeliveryDays: variantEstimatedDeliveryDays }
            : {}),
        };
      })
    : undefined;

  return {
    id: snapshot.id,
    name: data.name as string,
    description: data.description as string | undefined,
    imageUrl: data.imageUrl as string,
    ...(Array.isArray(data.customizationAttributes)
      ? { customizationAttributes: data.customizationAttributes }
      : {}),
    ...(variantPrices ? { variantPrices } : {}),
    ...(Array.isArray(data.defaultImages) ? { defaultImages: data.defaultImages } : {}),
    ...(includeGalleries
      ? {
          imageGalleries: publicGalleries.filter((gallery) => gallery.productId === snapshot.id),
        }
      : {}),
    priceCents: data.priceCents as number,
    ...(typeof data.promotionActive === 'boolean' ? { promotionActive } : {}),
    ...(promotionActive && typeof data.promotionalPriceCents === 'number'
      ? { promotionalPriceCents: data.promotionalPriceCents }
      : {}),
    ...(typeof data.estimatedDeliveryEnabled === 'boolean' ? { estimatedDeliveryEnabled } : {}),
    ...(estimatedDeliveryEnabled &&
    !hasCustomizationAttributes &&
    validEstimatedDeliveryDays(data.estimatedDeliveryDays)
      ? { estimatedDeliveryDays: data.estimatedDeliveryDays }
      : {}),
    durationMinutes: data.durationMinutes as number,
  };
}

function summarizeProductGallery(
  snapshot: QueryDocumentSnapshot<DocumentData, DocumentData>,
): ProductImageGallery {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    productId: data.productId as string,
    combinationKey: data.combinationKey as string,
    selections: data.selections as ProductCustomizationSelection[],
    images: data.images as ProductImage[],
  };
}

export async function getProductImageGalleries(
  slug: string,
  productId: string,
): Promise<ProductImageGallery[]> {
  if (!isValidBusinessSlug(slug) || !productId) return [];

  const galleries = await getDocsFromServer(
    query(
      collection(db, 'public_product_galleries'),
      where('businessSlug', '==', slug),
      where('productId', '==', productId),
      where('published', '==', true),
    ),
  );

  return galleries.docs
    .filter(
      (snapshot) =>
        snapshot.data().businessSlug === slug &&
        snapshot.data().productId === productId &&
        snapshot.data().published === true,
    )
    .map(summarizeProductGallery);
}

export async function getCompanyCatalog(
  slug: string,
  options: CompanyCatalogOptions = {},
): Promise<CompanyCatalog | null> {
  if (!isValidBusinessSlug(slug)) return null;

  const { productId, pageSize, after, includeGalleries = true } = options;
  const productConstraints: QueryConstraint[] = [
    where('businessSlug', '==', slug),
    where('active', '==', true),
    where('published', '==', true),
  ];

  if (productId) productConstraints.push(where(documentId(), '==', productId));

  if (pageSize) {
    productConstraints.push(orderBy('name'), orderBy(documentId()));
    if (after) productConstraints.push(startAfter(after.name, after.id));
    productConstraints.push(limit(pageSize));
  }

  const promotionConstraints: QueryConstraint[] = [
    where('businessSlug', '==', slug),
    where('active', '==', true),
    where('published', '==', true),
    where('promotionActive', '==', true),
    orderBy('name'),
    orderBy(documentId()),
  ];

  // Business, products and (only for a single product) galleries do not depend on each other.
  const [businesses, products, galleries, promotionalProducts] = await Promise.all([
    getDocsFromServer(
      query(
        collection(db, 'public_businesses'),
        where('slug', '==', slug),
        where('published', '==', true),
        limit(1),
      ),
    ),
    getDocsFromServer(query(collection(db, 'public_products'), ...productConstraints)),
    productId && includeGalleries
      ? getDocsFromServer(
          query(
            collection(db, 'public_product_galleries'),
            where('businessSlug', '==', slug),
            where('productId', '==', productId),
            where('published', '==', true),
          ),
        )
      : Promise.resolve({ docs: [] }),
    pageSize && !after
      ? getDocsFromServer(query(collection(db, 'public_products'), ...promotionConstraints))
      : Promise.resolve({ docs: [] }),
  ]);

  const businessDoc = businesses.docs[0];

  if (!businessDoc) return null;

  const rawBusiness = businessDoc.data();
  const tenantId = rawBusiness.tenantId as string;

  if (!tenantId) return null;

  const tenantProducts = products.docs.filter((snapshot) => snapshot.data().tenantId === tenantId);
  const tenantPromotions = promotionalProducts.docs.filter(
    (snapshot) => snapshot.data().tenantId === tenantId,
  );

  const business: CompanySummary = {
    id: businessDoc.id,
    name: rawBusiness.name as string,
    slug: rawBusiness.slug as string,
    segment: rawBusiness.segment,
    description: rawBusiness.description as string | undefined,
    logoUrl: rawBusiness.logoUrl as string | undefined,
    ...ColorUtil.readPublicBusinessColors(rawBusiness),
    ...(typeof rawBusiness.timezone === 'string' ? { timezone: rawBusiness.timezone } : {}),
  };

  const visibleProducts: PublicProductSummary[] = tenantProducts
    .map((snapshot) =>
      summarizeProduct(snapshot, galleries, Boolean(productId && includeGalleries)),
    )
    .filter(
      (product) =>
        Number.isInteger(product.priceCents) && Number.isInteger(product.durationMinutes),
    );
  const promotions = tenantPromotions
    .filter((snapshot) => snapshot.data().active === true && snapshot.data().published === true)
    .map((snapshot) => summarizeProduct(snapshot, galleries))
    .filter(
      (product) =>
        product.promotionActive === true &&
        Number.isInteger(product.priceCents) &&
        Number.isInteger(product.durationMinutes) &&
        hasValidActivePromotion(product),
    );

  return {
    business,
    products: visibleProducts,
    promotions,
    ...(pageSize ? { hasMore: products.docs.length === pageSize } : {}),
  };
}
