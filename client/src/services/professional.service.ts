import type { AvailableSlot } from '@shared/interfaces/availability.interface';
import type { EligibleProfessional } from '../interfaces/professional.interface';

export function eligibleProfessionals(slots: AvailableSlot[]): EligibleProfessional[] {
  const professionals = new Map<string, string>();

  for (const slot of slots) professionals.set(slot.professionalId, slot.professionalName);

  return [...professionals].map(([id, name]) => ({ id, name }));
}
