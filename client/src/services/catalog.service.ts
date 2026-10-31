import type {
  CompanyCatalog,
  CompanySummary,
  PublicProductSummary,
} from '../interfaces/company.interface';
import type {
  ProductCustomizationSelection,
  ProductImage,
  ProductVariantPrice,
} from '@shared/interfaces/product.interface';
import { isValidBusinessSlug } from '../utils/business-slug.util';
import {
  collection,
  documentId,
  getDocsFromServer,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from '../config/firebase.config';

export type CompanyCatalogOptions = {
  productId?: string;
  pageSize?: number;
  after?: Pick<PublicProductSummary, 'id' | 'name'>;
};

export async function getCompanyCatalog(
  slug: string,
  options: CompanyCatalogOptions = {},
): Promise<CompanyCatalog | null> {
  if (!isValidBusinessSlug(slug)) return null;

  const { productId, pageSize, after } = options;
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

  // Business, products and (only for a single product) galleries do not depend on each other.
  const [businesses, products, galleries] = await Promise.all([
    getDocsFromServer(
      query(
        collection(db, 'public_businesses'),
        where('slug', '==', slug),
        where('published', '==', true),
        limit(1),
      ),
    ),
    getDocsFromServer(query(collection(db, 'public_products'), ...productConstraints)),
    productId
      ? getDocsFromServer(
          query(
            collection(db, 'public_product_galleries'),
            where('businessSlug', '==', slug),
            where('productId', '==', productId),
            where('published', '==', true),
          ),
        )
      : Promise.resolve({ docs: [] }),
  ]);

  const businessDoc = businesses.docs[0];

  if (!businessDoc) return null;

  const rawBusiness = businessDoc.data();
  const tenantId = rawBusiness.tenantId as string;

  if (!tenantId) return null;

  const tenantProducts = products.docs.filter((snapshot) => snapshot.data().tenantId === tenantId);
  const business: CompanySummary = {
    id: businessDoc.id,
    name: rawBusiness.name as string,
    slug: rawBusiness.slug as string,
    segment: rawBusiness.segment,
    description: rawBusiness.description as string | undefined,
    logoUrl: rawBusiness.logoUrl as string | undefined,
  };

  const publicGalleries = galleries.docs.map((snapshot) => {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      productId: data.productId as string,
      combinationKey: data.combinationKey as string,
      selections: data.selections as ProductCustomizationSelection[],
      images: data.images as ProductImage[],
    };
  });

  const visibleProducts: PublicProductSummary[] = tenantProducts
    .map((snapshot) => {
      const data = snapshot.data();
      return {
        id: snapshot.id,
        name: data.name as string,
        description: data.description as string | undefined,
        imageUrl: data.imageUrl as string,
        ...(Array.isArray(data.customizationAttributes)
          ? { customizationAttributes: data.customizationAttributes }
          : {}),
        ...(Array.isArray(data.variantPrices)
          ? { variantPrices: data.variantPrices as ProductVariantPrice[] }
          : {}),
        ...(Array.isArray(data.defaultImages) ? { defaultImages: data.defaultImages } : {}),
        ...(productId
          ? {
              imageGalleries: publicGalleries.filter(
                (gallery) => gallery.productId === snapshot.id,
              ),
            }
          : {}),
        priceCents: data.priceCents as number,
        durationMinutes: data.durationMinutes as number,
      };
    })
    .filter(
      (product) =>
        Number.isInteger(product.priceCents) && Number.isInteger(product.durationMinutes),
    );

  return {
    business,
    products: visibleProducts,
    ...(pageSize ? { hasMore: products.docs.length === pageSize } : {}),
  };
}
