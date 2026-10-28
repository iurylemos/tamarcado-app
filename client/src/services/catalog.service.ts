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
import { collection, getDocsFromServer, limit, query, where } from 'firebase/firestore';
import { db } from '../config/firebase.config';

export async function getCompanyCatalog(slug: string): Promise<CompanyCatalog | null> {
  if (!isValidBusinessSlug(slug)) return null;

  const businesses = await getDocsFromServer(
    query(
      collection(db, 'public_businesses'),
      where('slug', '==', slug),
      where('published', '==', true),
      limit(1),
    ),
  );

  const businessDoc = businesses.docs[0];

  if (!businessDoc) return null;

  const rawBusiness = businessDoc.data();
  const tenantId = rawBusiness.tenantId as string;

  if (!tenantId) return null;

  const [products, galleries] = await Promise.all([
    getDocsFromServer(
      query(
        collection(db, 'public_products'),
        where('tenantId', '==', tenantId),
        where('businessSlug', '==', slug),
        where('active', '==', true),
        where('published', '==', true),
      ),
    ),
    getDocsFromServer(
      query(
        collection(db, 'public_product_galleries'),
        where('tenantId', '==', tenantId),
        where('businessSlug', '==', slug),
        where('published', '==', true),
        limit(500),
      ),
    ),
  ]);

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

  const visibleProducts: PublicProductSummary[] = products.docs
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
        imageGalleries: publicGalleries
          .filter((gallery) => gallery.productId === snapshot.id)
          .map((gallery) => gallery),
        priceCents: data.priceCents as number,
        durationMinutes: data.durationMinutes as number,
      };
    })
    .filter(
      (product) =>
        Number.isInteger(product.priceCents) && Number.isInteger(product.durationMinutes),
    );

  return { business, products: visibleProducts };
}
