import {
  FieldValue,
  getFirestore,
  type CollectionReference,
  type DocumentData,
  type Firestore,
  type Query,
} from 'firebase-admin/firestore';
import { getApps, initializeApp } from 'firebase-admin/app';
import { collections, type CollectionName } from '../config/collections';

if (getApps().length === 0) initializeApp();

export const firestore: Firestore = getFirestore();

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

export function professionalProductId(tenantId: string, professionalId: string, productId: string): string {
  return [tenantId, professionalId, productId].map(encodeURIComponent).join('__');
}

export function collectionNames(): readonly string[] {
  return Object.values(collections);
}
