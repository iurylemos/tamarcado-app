import { describe, expect, it } from 'vitest';
import { resolveProductPriceCents } from '@shared/product-price';

describe('resolveProductPriceCents', () => {
  const variantPrices = [
    {
      selections: [
        { attributeId: 'brow-service', optionId: 'design' },
        { attributeId: 'lash-service', optionId: 'volume-brasileiro' },
      ],
      priceCents: 14500,
    },
    {
      selections: [{ attributeId: 'lash-service', optionId: 'volume-brasileiro' }],
      priceCents: 12000,
    },
  ];

  it('resolves a price for the exact selection combination regardless of selection order', () => {
    expect(
      resolveProductPriceCents(
        10000,
        variantPrices,
        [
          { attributeId: 'lash-service', optionId: 'volume-brasileiro' },
          { attributeId: 'brow-service', optionId: 'design' },
        ],
      ),
    ).toBe(14500);
  });

  it('returns no price when a configured combination does not exist', () => {
    expect(
      resolveProductPriceCents(10000, variantPrices, [
        { attributeId: 'lash-service', optionId: 'volume-fox' },
      ]),
    ).toBeUndefined();
  });

  it('keeps the base price for products without variant prices', () => {
    expect(resolveProductPriceCents(10000, undefined, [])).toBe(10000);
    expect(resolveProductPriceCents(10000, null, [])).toBe(10000);
  });
});
