import type {
  ProductCustomizationAttribute,
  ProductCustomizationSelection,
} from '@shared/interfaces/product.interface';
import {
  productCustomizationCombinationKey,
  productCustomizationCombinations,
} from '@shared/product-variant-price';
import type { ProductRecord } from '../interfaces/product.interface';

export class DeliveryUtil {
  public static readonly generalEstimateKey: string = '__general__';

  public static inferEstimateGrouping(
    attributes: ProductCustomizationAttribute[],
    drafts: Record<string, string>,
  ): string {
    const combinations = productCustomizationCombinations(attributes);

    const values = combinations.map(
      (selections) => drafts[productCustomizationCombinationKey(selections)] ?? '',
    );

    if (new Set(values).size <= 1) return this.generalEstimateKey;

    const candidates = attributes.filter((attribute) =>
      attribute.options.every((option) => {
        const optionValues = combinations
          .filter((selections) =>
            selections.some(
              (selection) =>
                selection.attributeId === attribute.id && selection.optionId === option.id,
            ),
          )
          .map((selections) => drafts[productCustomizationCombinationKey(selections)] ?? '');
        return new Set(optionValues).size <= 1;
      }),
    );

    return candidates.length === 1 ? candidates[0].id : '';
  }

  public static resolveEstimatedDeliveryDays(
    product: ProductRecord,
    selections: ProductCustomizationSelection[],
  ): number | undefined {
    if (product.estimatedDeliveryEnabled !== true) return undefined;

    const attributes = product.customizationAttributes ?? [];

    let days: number | undefined;

    if (!attributes.length) {
      days = product.estimatedDeliveryDays;
    } else {
      const checkAttributesInvalid = attributes.some(
        (attribute) =>
          selections.filter(
            (selection) =>
              selection.attributeId === attribute.id &&
              attribute.options.some((option) => option.id === selection.optionId),
          ).length !== 1,
      );

      if (selections.length !== attributes.length || checkAttributesInvalid) {
        return undefined;
      }

      const key = productCustomizationCombinationKey(selections);

      const matches = (product.variantPrices ?? []).filter(
        (variant) => productCustomizationCombinationKey(variant.selections) === key,
      );

      if (matches.length !== 1) return undefined;

      days = matches[0]!.estimatedDeliveryDays;
    }

    return typeof days === 'number' && Number.isSafeInteger(days) && days > 0 ? days : undefined;
  }

  public static hasCompleteEstimatedDelivery(product: ProductRecord): boolean {
    const attributes = product.customizationAttributes ?? [];

    if (!attributes.length) {
      return this.resolveEstimatedDeliveryDays(product, []) !== undefined;
    }

    if (product.estimatedDeliveryEnabled !== true) return false;

    const combinations = productCustomizationCombinations(attributes);
    const variants = product.variantPrices ?? [];
    const byKey = new Map<string, number>();

    for (const variant of variants) {
      const key = productCustomizationCombinationKey(variant.selections);
      const days = variant.estimatedDeliveryDays;

      if (byKey.has(key) || typeof days !== 'number' || !Number.isSafeInteger(days) || days < 1) {
        return false;
      }

      byKey.set(key, days);
    }

    return (
      combinations.length > 0 &&
      combinations.length === variants.length &&
      combinations.every((selections) => byKey.has(productCustomizationCombinationKey(selections)))
    );
  }
}
