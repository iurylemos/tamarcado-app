export interface RequestedSlotValidationInput {
  tenantId: string;
  professionalId: string;
  startsAt: Date;
  durationMinutes: number;
  timezone: string;
  bookingIntervalMinutes: number;
  coldStart?: boolean;
}
