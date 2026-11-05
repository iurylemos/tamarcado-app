import type {
  AvailableProfessional,
  AvailableSlot,
} from '@shared/interfaces/availability.interface';
import type { SearchAvailabilityResult } from '@shared/interfaces/availability.interface';

export function eligibleProfessionals(slots: AvailableSlot[]): AvailableProfessional[] {
  const professionals = new Map<string, string>();

  for (const slot of slots) professionals.set(slot.professionalId, slot.professionalName);

  return [...professionals].map(([id, name]) => ({ id, name }));
}

export function eligibleProfessionalsWithinHorizon(
  result: SearchAvailabilityResult,
): AvailableProfessional[] {
  return result.eligibleProfessionals ?? [];
}
