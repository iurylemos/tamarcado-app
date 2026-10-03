export function calculateCommissionCents(
  priceCents: number,
  commissionType: 'percentage' | 'fixed',
  commissionValue: number,
): number {
  if (!Number.isSafeInteger(priceCents) || priceCents < 0) {
    throw new RangeError('Price must be a non-negative integer amount in cents.');
  }
  if (!Number.isSafeInteger(commissionValue) || commissionValue < 0) {
    throw new RangeError('Commission must be a non-negative integer.');
  }
  if (commissionType === 'fixed') return commissionValue;
  if (commissionType !== 'percentage') throw new RangeError('Commission type is not supported.');
  if (commissionValue > 10_000) throw new RangeError('Percentage commission cannot exceed 100%.');
  return Number((BigInt(priceCents) * BigInt(commissionValue) + 5_000n) / 10_000n);
}

export function formatBrl(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}
