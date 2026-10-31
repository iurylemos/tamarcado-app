import { collections } from '../config/collections';
import type { PublicBusinessDocument } from '../model/tenant.model';
import type { ProductDocument, PublicProductDocument } from '../model/product.model';
import type { PublicProductGalleryDocument } from '../model/product-gallery.model';
import type { ProductImageGallery } from '../../../shared/domain/interfaces/product.interface';
import { firestore } from './firestore.service';
import { DomainError } from '../../../shared/domain/errors';

export type PublicBusinessRecord = PublicBusinessDocument & {
  id: string;
};

type PublicProductRecord = PublicProductDocument & { id: string };

type BookedProductRecord = PublicProductDocument & ProductDocument & { id: string };

export async function findPublicBusiness(slug: string): Promise<PublicBusinessRecord> {
  const snapshot = await firestore
    .collection(collections.publicBusinesses)
    .where('slug', '==', slug)
    .where('published', '==', true)
    .limit(1)
    .get();

  const business = snapshot.docs[0];

  if (!business) throw new DomainError('NOT_FOUND', 'Empresa não encontrada.');

  return { id: business.id, ...(business.data() as PublicBusinessDocument) };
}

export async function listPublicBusinessRecords(segment?: string): Promise<PublicBusinessRecord[]> {
  let query = firestore.collection(collections.publicBusinesses).where('published', '==', true);

  if (segment) query = query.where('segment', '==', segment);

  const snapshot = await query.orderBy('name').get();

  return snapshot.docs
    .map((document) => ({ id: document.id, ...(document.data() as PublicBusinessDocument) }))
    .filter((business) => business.published);
}

async function getGalleryCatalog(business: PublicBusinessRecord, productIds: string[]) {
  const galleryBase = firestore
    .collection(collections.publicProductGalleries)
    .where('businessSlug', '==', business.slug)
    .where('tenantId', '==', business.tenantId)
    .where('published', '==', true);

  if (!productIds.length) return { docs: [] };

  if (productIds.length <= 30) {
    return await galleryBase.where('productId', 'in', productIds).get();
  }

  return await galleryBase.limit(500).get();
}

export async function listPublicProductRecords(
  business: PublicBusinessRecord,
): Promise<Array<PublicProductRecord>> {
  const snapshot = await firestore
    .collection(collections.publicProducts)
    .where('businessSlug', '==', business.slug)
    .where('tenantId', '==', business.tenantId)
    .where('active', '==', true)
    .where('published', '==', true)
    .orderBy('name')
    .get();

  const productIds = snapshot.docs.map((document) => document.id);

  const gallerySnapshot = await getGalleryCatalog(business, productIds);

  const galleriesByProduct = new Map<string, ProductImageGallery[]>();

  for (const galleryDocument of gallerySnapshot.docs) {
    const gallery = galleryDocument.data() as PublicProductGalleryDocument;

    if (
      gallery.tenantId !== business.tenantId ||
      gallery.businessSlug !== business.slug ||
      gallery.published !== true ||
      typeof gallery.productId !== 'string'
    ) {
      continue;
    }

    const galleries = galleriesByProduct.get(gallery.productId) ?? [];

    galleries.push({
      id: gallery.id || galleryDocument.id,
      productId: gallery.productId,
      combinationKey: gallery.combinationKey,
      selections: gallery.selections,
      images: gallery.images,
    });

    galleriesByProduct.set(gallery.productId, galleries);
  }

  return snapshot.docs
    .map((document) => ({ id: document.id, ...(document.data() as PublicProductDocument) }))
    .filter(
      (product) => product.tenantId === business.tenantId && product.active && product.published,
    )
    .map((product) => ({
      ...product,
      ...(galleriesByProduct.has(product.id)
        ? {
            imageGalleries: galleriesByProduct
              .get(product.id)!
              .map(({ id, productId, combinationKey, selections, images }) => ({
                id,
                productId,
                combinationKey,
                selections,
                images,
              })),
          }
        : {}),
    }));
}

/**
 * Resolves one published product with its galleries using a direct document read,
 * so it can run in parallel with the business lookup. The caller must compare
 * `tenantId` with the business before trusting the result.
 */
export async function findPublicProductRecord(
  slug: string,
  productId: string,
): Promise<PublicProductRecord | null> {
  const [snapshot, gallerySnapshot] = await Promise.all([
    firestore.collection(collections.publicProducts).doc(productId).get(),
    firestore
      .collection(collections.publicProductGalleries)
      .where('businessSlug', '==', slug)
      .where('productId', '==', productId)
      .where('published', '==', true)
      .get(),
  ]);

  const product = snapshot.data() as PublicProductDocument | undefined;

  if (!product || product.businessSlug !== slug || !product.active || !product.published) {
    return null;
  }

  const imageGalleries: ProductImageGallery[] = gallerySnapshot.docs
    .map((document) => ({ document, gallery: document.data() as PublicProductGalleryDocument }))
    .filter(({ gallery }) => gallery.tenantId === product.tenantId && gallery.published === true)
    .map(({ document, gallery }) => ({
      id: gallery.id || document.id,
      productId: gallery.productId,
      combinationKey: gallery.combinationKey,
      selections: gallery.selections,
      images: gallery.images,
    }));

  return {
    id: snapshot.id,
    ...product,
    ...(imageGalleries.length ? { imageGalleries } : {}),
  };
}

export async function findBookableProduct(
  business: PublicBusinessRecord,
  productId: string,
): Promise<BookedProductRecord> {
  const snapshot = await firestore.collection(collections.products).doc(productId).get();
  const product = snapshot.data() as ProductDocument;

  if (!snapshot.exists || !product || product.tenantId !== business.tenantId) {
    throw new DomainError('NOT_FOUND', 'Serviço não encontrado para esta empresa.');
  }

  if (product.active !== true) {
    throw new DomainError('NOT_BOOKABLE', 'Este serviço não está disponível.');
  }

  return {
    id: snapshot.id,
    ...(product as Omit<PublicProductDocument, 'businessSlug' | 'published'>),
    businessSlug: business.slug,
    published: true,
    commissionValue: product.commissionValue,
    commissionType: product.commissionType,
  };
}
