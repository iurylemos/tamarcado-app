import type {
  ProductCustomizationSelection,
  ProductImageGallery,
} from '@shared/interfaces/product.interface';
import type { CompanyCatalog, PublicProductSummary } from '../interfaces/company.interface';

export class BookingUtil {
  public static findSelectedGallery(
    product: PublicProductSummary,
    selections: ProductCustomizationSelection[],
    galleries: ProductImageGallery[] | undefined,
  ): ProductImageGallery | undefined {
    return galleries?.find(
      (gallery) =>
        gallery.selections.length === (product.customizationAttributes?.length ?? 0) &&
        gallery.selections.every((selection) =>
          selections.some(
            (current) =>
              current.attributeId === selection.attributeId &&
              current.optionId === selection.optionId,
          ),
        ) &&
        selections.every((selection) =>
          gallery.selections.some(
            (current) =>
              current.attributeId === selection.attributeId &&
              current.optionId === selection.optionId,
          ),
        ),
    );
  }

  public static findCachedGalleries = (
    source: CompanyCatalog | undefined,
    slug: string,
    productId: string,
  ): ProductImageGallery[] | undefined => {
    return source && source.business.slug === slug
      ? source.products.find((item) => item.id === productId)?.imageGalleries
      : undefined;
  };
}
