import { resolveProductPricing } from '../../../shared/domain/product-price.js';
import type { PublicProductSummary } from '../interfaces/company.interface';

type ProductVariantSelections = NonNullable<
  PublicProductSummary['variantPrices']
>[number]['selections'];

export class CatalogUtil {
  public static readonly defaultLimitPageSize: number = 10;

  public static hasValidVariantSelections(
    product: PublicProductSummary,
    selections: ProductVariantSelections,
  ): boolean {
    const attributes = product.customizationAttributes ?? [];

    return (
      attributes.length > 0 &&
      selections.length === attributes.length &&
      attributes.every((attribute) => {
        const selectedOptions = selections.filter(
          (selection) => selection.attributeId === attribute.id,
        );
        return (
          selectedOptions.length === 1 &&
          attribute.options.some((option) => option.id === selectedOptions[0]?.optionId)
        );
      })
    );
  }

  public static estimatedDeliveryLabel(product: PublicProductSummary): string {
    const attributes = product.customizationAttributes ?? [];

    const validVariants = (product.variantPrices ?? []).filter(
      (variant) =>
        this.hasValidVariantSelections(product, variant.selections) &&
        resolveProductPricing(product, variant.selections) !== undefined,
    );

    const days =
      attributes.length === 0
        ? [product.estimatedDeliveryDays]
        : validVariants.map((variant) => variant.estimatedDeliveryDays);

    if (
      days.length > 0 &&
      days.every(
        (value): value is number =>
          typeof value === 'number' && Number.isSafeInteger(value) && value > 0,
      )
    ) {
      const uniqueDays = new Set(days);
      if (uniqueDays.size === 1) return `Prazo estimado · ${days[0]} dias`;
      return 'Prazo estimado · varia conforme a opção';
    }

    return attributes.length > 0 ? 'Prazo estimado · consulte as opções' : 'Prazo estimado';
  }

  public static serviceScheduleLabel(product: PublicProductSummary): string {
    return product.estimatedDeliveryEnabled
      ? this.estimatedDeliveryLabel(product)
      : `${product.durationMinutes} min · Escolher horário`;
  }
}
