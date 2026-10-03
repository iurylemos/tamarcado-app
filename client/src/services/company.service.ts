import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { db } from '../config/firebase.config';
import type { BusinessSegment } from '@shared/interfaces/tenant.interface';
import type { CompanySummary } from '../interfaces/company.interface';

const supportedSegments = new Set<BusinessSegment>([
  'beauty',
  'health',
  'fitness',
  'automotive',
  'other',
]);

export async function listPublicCompanies(segment?: BusinessSegment): Promise<CompanySummary[]> {
  const constraints = [where('published', '==', true)];

  if (segment && supportedSegments.has(segment)) constraints.push(where('segment', '==', segment));

  const result = await getDocs(
    query(collection(db, 'public_businesses'), ...constraints, orderBy('name')),
  );

  const mapperDocs = result.docs.map((snapshot) => {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      name: data.name as string,
      slug: data.slug as string,
      segment: data.segment as BusinessSegment,
      description: data.description as string | undefined,
      logoUrl: data.logoUrl as string | undefined,
    };
  });

  return mapperDocs.filter((business) => supportedSegments.has(business.segment));
}
