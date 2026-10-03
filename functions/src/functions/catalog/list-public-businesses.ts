import { onCall } from 'firebase-functions/v2/https';
import { HttpsError } from 'firebase-functions/v2/https';
import { listPublicBusinessRecords } from '../../services/public-catalog.service';

const segments = new Set(['beauty', 'health', 'fitness', 'automotive', 'other']);

export const listPublicBusinesses = onCall(async (request) => {
  const segment = request.data?.segment;

  if (segment !== undefined && (typeof segment !== 'string' || !segments.has(segment))) {
    throw new HttpsError('invalid-argument', 'O segmento informado não é válido.');
  }

  const businesses = await listPublicBusinessRecords(segment);

  return businesses.map(({ id, name, slug, segment: businessSegment, description, logoUrl }) => ({
    id,
    name,
    slug,
    segment: businessSegment,
    description,
    logoUrl,
  }));
});
