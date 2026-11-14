import { resolveProductPricing } from '@shared/product-price';
import type { ProductCustomizationSelection } from '@shared/interfaces/product.interface';
import type { PublicProductSummary } from '../interfaces/company.interface';
import { CatalogUtil } from './catalog.util';

export class ComboUtil {
  public static hasComboItems(product: PublicProductSummary): boolean {
    const items = product.comboItems ?? [];
    const ids = new Set(items.map((item) => item.id));

    return (
      items.length >= 2 &&
      ids.size === items.length &&
      items.every((item) => item.id && item.label.trim()) &&
      (product.customizationAttributes ?? []).every(
        (attribute) => !!attribute.comboItemId && ids.has(attribute.comboItemId),
      )
    );
  }

  public static validComboVariants(
    product: PublicProductSummary,
  ): ProductCustomizationSelection[][] {
    return (product.variantPrices ?? [])
      .filter((variant) => {
        const pricing = resolveProductPricing(product, variant.selections);
        return (
          CatalogUtil.hasValidVariantSelections(product, variant.selections) &&
          pricing !== undefined &&
          Number.isSafeInteger(pricing.originalPriceCents) &&
          pricing.originalPriceCents >= 0
        );
      })
      .map((variant) => variant.selections);
  }

  public static closestComboSelection(
    candidates: ProductCustomizationSelection[][],
    current: ProductCustomizationSelection[],
    required?: ProductCustomizationSelection,
  ): ProductCustomizationSelection[] | undefined {
    let best: ProductCustomizationSelection[] | undefined;
    let bestScore = -1;

    for (const candidate of candidates) {
      const checkCandidate =
        required &&
        !candidate.some(
          (selection) =>
            selection.attributeId === required.attributeId &&
            selection.optionId === required.optionId,
        );

      if (checkCandidate) {
        continue;
      }

      const score = candidate.filter((selection) =>
        current.some(
          (previous) =>
            previous.attributeId === selection.attributeId &&
            previous.optionId === selection.optionId,
        ),
      ).length;

      if (score > bestScore) {
        best = candidate;
        bestScore = score;
      }
    }
    return best;
  }
}
