export interface WorkingHours {
  id: string;
  tenantId: string;
  professionalId: string;
  dayOfWeek: number;
  startLocalTime: string;
  endLocalTime: string;
  active: boolean;
}

export interface BlockedPeriod {
  id: string;
  tenantId: string;
  professionalId?: string;
  startsAt: Date;
  endsAt: Date;
  reason?: string;
}

export interface AvailableSlot {
  startsAt: string;
  endsAt: string;
  professionalId: string;
  professionalName: string;
}

export interface ListAvailabilityInput {
  businessSlug: string;
  productId: string;
  date: string;
  professionalId?: string;
}

export interface SearchAvailabilityInput {
  businessSlug: string;
  productId: string;
  date: string;
}

export interface SearchAvailabilityResult {
  date: string | null;
  slots: AvailableSlot[];
}
