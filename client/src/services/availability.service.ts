import { httpsCallable } from 'firebase/functions';
import type {
  AvailableSlot,
  ListAvailabilityInput,
  SearchAvailabilityInput,
  SearchAvailabilityResult,
} from '@shared/interfaces/availability.interface';
import { functions } from '../config/firebase-functions.config';
import { SentryClientRequestOperation } from '../interfaces/sentry.interface';
import { SentryUtil } from '../utils/sentry.util';

export class AvailabilityService {
  public static async listAvailability(input: ListAvailabilityInput): Promise<AvailableSlot[]> {
    const call = httpsCallable<ListAvailabilityInput, AvailableSlot[]>(
      functions,
      'listAvailability',
    );
    const response = await call(input);
    return response.data;
  }

  public static async searchAvailability(
    input: SearchAvailabilityInput,
  ): Promise<SearchAvailabilityResult> {
    return await SentryUtil.trackClientRequest(
      SentryClientRequestOperation.AVAILABILITY_SEARCH,
      async (): Promise<SearchAvailabilityResult> => {
        const call = httpsCallable<SearchAvailabilityInput, SearchAvailabilityResult>(
          functions,
          'searchAvailability',
        );
        const response = await call(input);
        return response.data;
      },
    );
  }

  public static async searchAvailabilityForEstimation(
    input: Omit<SearchAvailabilityInput, 'includeEligibleProfessionals'>,
  ): Promise<SearchAvailabilityResult> {
    return await this.searchAvailability({ ...input, includeEligibleProfessionals: true });
  }
}
