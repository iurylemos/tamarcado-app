import { onCall } from 'firebase-functions/v2/https';
import { HttpsError } from 'firebase-functions/v2/https';
import type { PublicBusiness } from '@shared/interfaces/tenant.interface';
import { listPublicBusinessRecords } from '../../services/public-catalog.service';
import { callableOptionsPublic } from '../../options/callable.option';

const segments = new Set(['beauty', 'health', 'fitness', 'automotive', 'home', 'other']);

export const listPublicBusinesses = onCall(
  callableOptionsPublic,
  async (request): Promise<PublicBusiness[]> => {
    const segment = request.data?.segment;

    if (segment !== undefined && (typeof segment !== 'string' || !segments.has(segment))) {
      throw new HttpsError('invalid-argument', 'O segmento informado não é válido.');
    }

    const businesses = await listPublicBusinessRecords(segment);

    const publicBusiness: PublicBusiness[] = businesses.map(
      ({ id, name, slug, segment: businessSegment, description, logoUrl }) => ({
        id,
        name,
        slug,
        segment: businessSegment,
        description,
        logoUrl,
      }),
    );

    return publicBusiness;
  },
);
