import {
  FieldValue,
  initializeFirestore,
  type CollectionReference,
  type DocumentData,
  type Firestore,
  type Query,
} from 'firebase-admin/firestore';
import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { collections, type CollectionName } from '../config/collections';
export { professionalProductId } from '../utils/professional-product-id';

const app = getApps().length ? getApp() : initializeApp();

export const firestore: Firestore = initializeFirestore(app);

export function rootCollection<T extends DocumentData = DocumentData>(
  name: CollectionName,
): CollectionReference<T> {
  return firestore.collection(name) as CollectionReference<T>;
}

export function tenantQuery<T extends DocumentData = DocumentData>(
  collection: CollectionName,
  tenantId: string,
): Query<T> {
  return rootCollection<T>(collection).where('tenantId', '==', tenantId);
}

export function serverTimestamps() {
  return { createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() };
}

export function collectionNames(): readonly string[] {
  return Object.values(collections);
}
