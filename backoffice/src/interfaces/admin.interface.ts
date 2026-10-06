import type { BusinessSegment } from '@shared/interfaces/tenant.interface';
import type { CommissionType } from '@shared/interfaces/product.interface';

export interface CompanyRecord {
  id: string;
  name: string;
  slug: string;
  segment: BusinessSegment;
  description?: string;
  phoneE164?: string;
  logoUrl?: string;
  emailDomain?: string;
  timezone: string;
  bookingIntervalMinutes: number;
  active: boolean;
}

export interface ProductRecord {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  imageUrl: string;
  priceCents: number;
  durationMinutes: number;
  commissionType: CommissionType;
  commissionValue: number;
  active: boolean;
}

export interface ProfessionalRecord {
  id: string;
  tenantId: string;
  name: string;
  phoneE164: string;
  photoUrl?: string;
  active: boolean;
}

export interface AssignmentRecord {
  id: string;
  tenantId: string;
  professionalId: string;
  productId: string;
  active: boolean;
}

export interface WorkingHoursRecord {
  id: string;
  tenantId: string;
  professionalId: string;
  dayOfWeek: number;
  startLocalTime: string;
  endLocalTime: string;
  active: boolean;
}

export type InputWorkingHours = Omit<WorkingHoursRecord, 'tenantId' | 'id'> & { id?: string };
export interface BlockedPeriodRecord {
  id: string;
  tenantId: string;
  professionalId?: string;
  reason?: string;
  startsAt: string;
  endsAt: string;
}

export interface BackofficeWorkspace {
  company: CompanyRecord;
  products: ProductRecord[];
  professionals: ProfessionalRecord[];
  assignments: AssignmentRecord[];
  collaboratorEmails?: Record<string, string>;
  workingHours: WorkingHoursRecord[];
  blockedPeriods: BlockedPeriodRecord[];
}

export type BackofficeSection =
  'dashboard' | 'company' | 'products' | 'professionals' | 'availability' | 'reports';
