import type { Timestamp } from 'firebase-admin/firestore';
import type { BusinessSegment } from '../../../shared/domain/interfaces/tenant.interface';

export interface TenantDocument {
  name: string;
  slug: string;
  segment: BusinessSegment;
  description?: string;
  phoneE164?: string;
  logoUrl?: string;
  timezone: string;
  bookingIntervalMinutes: number;
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PublicBusinessDocument {
  tenantId: string;
  name: string;
  slug: string;
  segment: BusinessSegment;
  description?: string;
  logoUrl?: string;
  published: boolean;
}
