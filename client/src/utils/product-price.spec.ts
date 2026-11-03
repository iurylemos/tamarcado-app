import { describe, expect, it } from 'vitest';
import { resolveProductPriceCents, resolveProductPricing } from '@shared/product-price';

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
      resolveProductPriceCents(10000, variantPrices, [
        { attributeId: 'lash-service', optionId: 'volume-brasileiro' },
        { attributeId: 'brow-service', optionId: 'design' },
      ]),
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

  it('uses the active promotional price while preserving the original price', () => {
    expect(
      resolveProductPricing(
        {
          priceCents: 12000,
          promotionActive: true,
          promotionalPriceCents: 9000,
        },
        [],
      ),
    ).toEqual({
      originalPriceCents: 12000,
      effectivePriceCents: 9000,
      promotionApplied: true,
    });
  });

  it.each([
    ['inactive', { promotionActive: false, promotionalPriceCents: 9000 }],
    ['missing', { promotionActive: true }],
    ['not lower', { promotionActive: true, promotionalPriceCents: 12000 }],
    ['fractional', { promotionActive: true, promotionalPriceCents: 9000.5 }],
  ])('keeps the original price when the promotion is %s', (_label, promotion) => {
    expect(
      resolveProductPricing(
        {
          priceCents: 12000,
          ...promotion,
        },
        [],
      ),
    ).toEqual({
      originalPriceCents: 12000,
      effectivePriceCents: 12000,
      promotionApplied: false,
    });
  });

  it('resolves original and promotional prices for the exact selected variant', () => {
    expect(
      resolveProductPricing(
        {
          priceCents: 10000,
          promotionActive: true,
          variantPrices: [
            {
              selections: [{ attributeId: 'color', optionId: 'blue' }],
              priceCents: 15000,
              promotionalPriceCents: 12000,
            },
            {
              selections: [{ attributeId: 'color', optionId: 'red' }],
              priceCents: 11000,
              promotionalPriceCents: 8000,
            },
          ],
        },
        [{ attributeId: 'color', optionId: 'red' }],
      ),
    ).toEqual({
      originalPriceCents: 11000,
      effectivePriceCents: 8000,
      promotionApplied: true,
    });
  });

  it('does not resolve a promotional price for a missing variant combination', () => {
    expect(
      resolveProductPricing(
        {
          priceCents: 10000,
          promotionActive: true,
          variantPrices,
        },
        [{ attributeId: 'brow-service', optionId: 'other' }],
      ),
    ).toBeUndefined();
  });
});
