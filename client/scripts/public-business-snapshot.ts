import {
  collection,
  getDocsFromServer,
  query,
  where,
  type Firestore,
} from 'firebase/firestore';
import type { BusinessSegment } from '../../shared/domain/interfaces/tenant.interface.ts';
import type { CompanySummary } from '../src/interfaces/company.interface.ts';

const businessSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const businessSegments = new Set<BusinessSegment>([
  'beauty',
  'health',
  'fitness',
  'automotive',
  'home',
  'other',
]);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function publicImageUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export async function readPublicBusinessSnapshot(db: Firestore): Promise<CompanySummary[]> {
  const businesses = await getDocsFromServer(
    query(collection(db, 'public_businesses'), where('published', '==', true)),
  );
  const seenSlugs = new Set<string>();

  return businesses.docs.map((document) => {
    const data = document.data();
    const slug = data.slug;

    if (
      !isNonEmptyString(document.id) ||
      !isNonEmptyString(data.name) ||
      !isNonEmptyString(slug) ||
      !businessSlugPattern.test(slug) ||
      !isNonEmptyString(data.tenantId) ||
      typeof data.segment !== 'string' ||
      !businessSegments.has(data.segment as BusinessSegment)
    ) {
      throw new Error('A published public business record is invalid.');
    }

    if (seenSlugs.has(slug)) {
      throw new Error('Published public business records contain duplicate slugs.');
    }
    seenSlugs.add(slug);

    const logoUrl = publicImageUrl(data.logoUrl);

    return {
      id: document.id,
      name: data.name.trim(),
      slug,
      segment: data.segment as BusinessSegment,
      ...(typeof data.description === 'string' && data.description.trim()
        ? { description: data.description.trim() }
        : {}),
      ...(logoUrl ? { logoUrl } : {}),
      ...(typeof data.timezone === 'string' && data.timezone.trim()
        ? { timezone: data.timezone.trim() }
        : {}),
    };
  });
}
