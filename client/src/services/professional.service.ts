import type {
  AvailableProfessional,
  AvailableSlot,
} from '@shared/interfaces/availability.interface';
import type { SearchAvailabilityResult } from '@shared/interfaces/availability.interface';

export class ProfessionalService {
  public static eligibleProfessionals(slots: AvailableSlot[]): AvailableProfessional[] {
    const professionals = new Map<string, string>();

    for (const slot of slots) professionals.set(slot.professionalId, slot.professionalName);

    return [...professionals].map(([id, name]) => ({ id, name }));
  }

  public static eligibleProfessionalsWithinHorizon(
    result: SearchAvailabilityResult,
  ): AvailableProfessional[] {
    return result.eligibleProfessionals ?? [];
  }
}
