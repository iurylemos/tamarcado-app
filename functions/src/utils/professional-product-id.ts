export function professionalProductId(
  tenantId: string,
  professionalId: string,
  productId: string,
): string {
  return [tenantId, professionalId, productId].map(encodeURIComponent).join('__');
}
