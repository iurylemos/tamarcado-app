import type { InfiniteData } from '@tanstack/react-query';
import { resolveProductPricing } from '../../../shared/domain/product-price.js';
import type {
  CompanyCatalog,
  CompanySummary,
  PublicProductSummary,
} from '../interfaces/company.interface';
import type { PublicCatalogStatus } from '../interfaces/catalog.interface.js';

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

  public static getCatalogByPage(
    data: InfiniteData<CompanyCatalog | null, unknown>,
  ): CompanyCatalog | null {
    const pages = data?.pages ?? [];
    const [first] = pages;

    if (!first) return null;

    return { ...first, products: pages.flatMap((page) => page?.products ?? []) };
  }

  public static checkCatalogAvailability(error: Error | null): boolean {
    return (
      error !== null &&
      typeof error === 'object' &&
      'code' in error &&
      (error.code === 'unavailable' || error.code === 'firestore/unavailable')
    );
  }

  public static checkCatalogStatus(
    isPending: boolean,
    isError: boolean,
    isUnavailable: boolean,
    catalog: CompanyCatalog | null,
    isFetched: boolean,
    initialBusiness?: CompanySummary | null,
  ): PublicCatalogStatus | 'loading' {
    return isPending || (initialBusiness != null && !isFetched)
      ? 'loading'
      : isError
        ? isUnavailable
          ? 'unavailable'
          : 'error'
        : catalog
          ? 'ready'
          : 'not-found';
  }
}
