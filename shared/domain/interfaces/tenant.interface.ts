export type BusinessSegment = 'beauty' | 'health' | 'fitness' | 'automotive' | 'home' | 'other';

export interface PublicBusiness {
  id: string;
  name: string;
  slug: string;
  segment: BusinessSegment;
  description?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  timezone?: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  segment: BusinessSegment;
  description?: string;
  phoneE164?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  timezone: string;
  bookingIntervalMinutes: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
