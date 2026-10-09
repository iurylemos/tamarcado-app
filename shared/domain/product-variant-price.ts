import type {
  ProductCustomizationAttribute,
  ProductCustomizationSelection,
} from './interfaces/product.interface.js';

export function productCustomizationCombinationKey(
  selections: readonly ProductCustomizationSelection[],
): string {
  return JSON.stringify(
    [...selections]
      .sort((first, second) => first.attributeId.localeCompare(second.attributeId))
      .map(({ attributeId, optionId }) => [attributeId, optionId]),
  );
}

export function productCustomizationCombinations(
  attributes: readonly ProductCustomizationAttribute[],
): ProductCustomizationSelection[][] {
  if (attributes.length === 0) return [];

  return attributes.reduce<ProductCustomizationSelection[][]>(
    (combinations, attribute) =>
      combinations.flatMap((combination) =>
        attribute.options.map((option) => [
          ...combination,
          { attributeId: attribute.id, optionId: option.id },
        ]),
      ),
    [[]],
  );
}
