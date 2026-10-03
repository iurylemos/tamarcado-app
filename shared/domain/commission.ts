import { calculateCommissionCents } from './money.js';
import type { CommissionType } from './interfaces/product.interface.js';

export function calculateSnapshotCommission(
  priceCents: number,
  commissionType: CommissionType,
  commissionValue: number,
): number {
  return calculateCommissionCents(priceCents, commissionType, commissionValue);
}
