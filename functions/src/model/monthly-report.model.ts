import type { Timestamp } from 'firebase-admin/firestore';

export type MonthlyReportDimension = 'tenant' | 'professional' | 'product';

export interface MonthlyReportDocument {
  tenantId: string;
  year: number;
  month: number;
  timezone: string;
  dimensionType: MonthlyReportDimension;
  dimensionId: string;
  totalSalesCents: number;
  totalCommissionCents: number;
  generatedAt: Timestamp;
  updatedAt: Timestamp;
}
