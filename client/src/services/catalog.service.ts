import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase.config';
import type {
  CompanyCatalog,
  CompanySummary,
  PublicProductSummary,
} from '../interfaces/company.interface';
import { isValidBusinessSlug } from '../utils/business-slug.util';

export async function getCompanyCatalog(slug: string): Promise<CompanyCatalog | null> {
  if (!isValidBusinessSlug(slug)) return null;

  const [businesses, products] = await Promise.all([
    getDocs(
      query(
        collection(db, 'public_businesses'),
        where('slug', '==', slug),
        where('published', '==', true),
      ),
    ),
    getDocs(
      query(
        collection(db, 'public_products'),
        where('businessSlug', '==', slug),
        where('active', '==', true),
        where('published', '==', true),
      ),
    ),
  ]);
  const businessDoc = businesses.docs[0];

  if (!businessDoc) return null;

  const rawBusiness = businessDoc.data();
  const tenantId = rawBusiness.tenantId as string;

  if (!tenantId) return null;

  const business: CompanySummary = {
    id: businessDoc.id,
    name: rawBusiness.name as string,
    slug: rawBusiness.slug as string,
    segment: rawBusiness.segment,
    description: rawBusiness.description as string | undefined,
    logoUrl: rawBusiness.logoUrl as string | undefined,
  };

  const visibleProducts: PublicProductSummary[] = products.docs
    .filter((snapshot) => snapshot.data().tenantId === tenantId)
    .map((snapshot) => {
      const data = snapshot.data();
      return {
        id: snapshot.id,
        name: data.name as string,
        description: data.description as string | undefined,
        imageUrl: data.imageUrl as string,
        priceCents: data.priceCents as number,
        durationMinutes: data.durationMinutes as number,
      };
    })
    .filter(
      (product) =>
        Number.isInteger(product.priceCents) &&
        Number.isInteger(product.durationMinutes),
    );
  return { business, products: visibleProducts };
}
