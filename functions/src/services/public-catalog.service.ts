import { FieldPath } from 'firebase-admin/firestore';
import { collections } from '../config/collections';
import type { PublicBusinessDocument } from '../model/tenant.model';
import type { ProductDocument, PublicProductDocument } from '../model/product.model';
import type { PublicProductGalleryDocument } from '../model/product-gallery.model';
import type { ProductImageGallery } from '../../../shared/domain/interfaces/product.interface';
import { firestore } from './firestore.service';
import { DomainError } from '../../../shared/domain/errors';

export interface PublicBusinessRecord extends PublicBusinessDocument {
  id: string;
}

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

export async function listPublicProductRecords(
  business: PublicBusinessRecord,
  options: { limit?: number; productId?: string } = {},
): Promise<Array<PublicProductDocument & { id: string }>> {
  const { limit, productId } = options;
  let productsQuery = firestore
    .collection(collections.publicProducts)
    .where('businessSlug', '==', business.slug)
    .where('tenantId', '==', business.tenantId)
    .where('active', '==', true)
    .where('published', '==', true);

  if (productId) productsQuery = productsQuery.where(FieldPath.documentId(), '==', productId);

  const orderedQuery = productsQuery.orderBy('name');
  const snapshot = await (limit ? orderedQuery.limit(limit) : orderedQuery).get();

  const productIds = snapshot.docs.map((document) => document.id);
  const galleryBase = firestore
    .collection(collections.publicProductGalleries)
    .where('businessSlug', '==', business.slug)
    .where('tenantId', '==', business.tenantId)
    .where('published', '==', true);
  // Firestore 'in' accepts at most 30 values; unbounded listings keep the original capped query.
  const gallerySnapshot =
    productIds.length === 0
      ? { docs: [] }
      : productIds.length <= 30
        ? await galleryBase.where('productId', 'in', productIds).get()
        : await galleryBase.limit(500).get();

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

export async function findBookableProduct(
  business: PublicBusinessRecord,
  productId: string,
): Promise<PublicProductDocument & ProductDocument & { id: string }> {
  const snapshot = await firestore.collection(collections.products).doc(productId).get();
  const product = snapshot.data();

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
