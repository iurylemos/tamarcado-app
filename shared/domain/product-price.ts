import type {
  ProductCustomizationSelection,
  ProductVariantPrice,
} from './interfaces/product.interface.js';

export function resolveProductPriceCents(
  basePriceCents: number,
  variantPrices: readonly ProductVariantPrice[] | null | undefined,
  selections: readonly ProductCustomizationSelection[],
): number | undefined {
  if (!variantPrices?.length) return basePriceCents;

  return variantPrices.find(
    (variant) =>
      variant.selections.length === selections.length &&
      variant.selections.every((candidate) =>
        selections.some(
          (selection) =>
            selection.attributeId === candidate.attributeId &&
            selection.optionId === candidate.optionId,
        ),
      ),
  )?.priceCents;
}
