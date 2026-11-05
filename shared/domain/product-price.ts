import type {
  PublicProduct,
  ProductCustomizationSelection,
  ProductVariantPrice,
} from './interfaces/product.interface.js';

export interface ResolvedProductPricing {
  originalPriceCents: number;
  effectivePriceCents: number;
  promotionApplied: boolean;
}

type ProductPricingSource = Pick<
  PublicProduct,
  'priceCents' | 'variantPrices' | 'promotionActive' | 'promotionalPriceCents'
>;

function isValidPromotionalPrice(promotionalPriceCents: unknown, originalPriceCents: number) {
  return (
    typeof promotionalPriceCents === 'number' &&
    Number.isSafeInteger(promotionalPriceCents) &&
    promotionalPriceCents >= 0 &&
    promotionalPriceCents < originalPriceCents
  );
}

export function hasValidActivePromotion(product: ProductPricingSource): boolean {
  if (product.promotionActive !== true) return false;
  if (product.variantPrices?.length) {
    return product.variantPrices.every((variant) =>
      isValidPromotionalPrice(variant.promotionalPriceCents, variant.priceCents),
    );
  }
  return isValidPromotionalPrice(product.promotionalPriceCents, product.priceCents);
}

export function resolveProductPricing(
  product: ProductPricingSource,
  selections: readonly ProductCustomizationSelection[],
): ResolvedProductPricing | undefined {
  const variant = product.variantPrices?.length
    ? product.variantPrices.find(
        (candidate) =>
          candidate.selections.length === selections.length &&
          candidate.selections.every((selection) =>
            selections.some(
              (selected) =>
                selected.attributeId === selection.attributeId &&
                selected.optionId === selection.optionId,
            ),
          ),
      )
    : undefined;

  if (product.variantPrices?.length && !variant) return undefined;

  const originalPriceCents = variant?.priceCents ?? product.priceCents;
  const promotionalPriceCents = variant
    ? variant.promotionalPriceCents
    : product.promotionalPriceCents;
  const promotionApplied =
    product.promotionActive === true &&
    isValidPromotionalPrice(promotionalPriceCents, originalPriceCents);

  return {
    originalPriceCents,
    effectivePriceCents:
      promotionApplied && typeof promotionalPriceCents === 'number'
        ? promotionalPriceCents
        : originalPriceCents,
    promotionApplied,
  };
}

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
