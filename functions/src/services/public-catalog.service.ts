import { collections } from '../config/collections';
import type { PublicBusinessDocument } from '../model/tenant.model';
import type { ProductDocument, PublicProductDocument } from '../model/product.model';
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
): Promise<Array<PublicProductDocument & { id: string }>> {
  const snapshot = await firestore
    .collection(collections.publicProducts)
    .where('businessSlug', '==', business.slug)
    .where('tenantId', '==', business.tenantId)
    .where('active', '==', true)
    .where('published', '==', true)
    .orderBy('name')
    .get();

  const allDocs = snapshot.docs
    .map((document) => ({ id: document.id, ...(document.data() as PublicProductDocument) }))
    .filter(
      (product) => product.tenantId === business.tenantId && product.active && product.published,
    );

  return allDocs;
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
