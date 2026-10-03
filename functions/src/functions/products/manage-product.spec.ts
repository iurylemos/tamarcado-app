import { describe, expect, it } from 'vitest';
import { validateProductInput } from '../../services/backoffice.service';

const validProduct = {
  name: 'Corte e finalização',
  imageUrl: 'https://images.example.test/corte.jpg',
  priceCents: 12000,
  durationMinutes: 60,
  commissionType: 'percentage',
  commissionValue: 3500,
  active: true,
};

describe('product administration validation', () => {
  it.each([
    ['negative price', { priceCents: -1 }],
    ['fractional price', { priceCents: 1200.5 }],
    ['zero duration', { durationMinutes: 0 }],
    ['unsupported commission type', { commissionType: 'other' }],
    ['negative commission', { commissionValue: -1 }],
    ['commission over 100 percent', { commissionValue: 10001 }],
    ['non-HTTP image URL', { imageUrl: 'javascript:alert(1)' }],
  ])('rejects %s', async (_label, changes) => {
    let failure: unknown;
    try {
      validateProductInput({ ...validProduct, ...changes });
    } catch (error) {
      failure = error;
    }
    expect(failure).toMatchObject({ code: 'invalid-argument' });
  });

  it('accepts the zero-price and zero-commission boundaries before persistence', async () => {
    expect(
      validateProductInput({
        ...validProduct,
        priceCents: 0,
        commissionValue: 0,
      }),
    ).toMatchObject({ priceCents: 0, commissionValue: 0 });
  });

  it('preserves image and active state in the validated product payload', () => {
    expect(validateProductInput(validProduct)).toMatchObject({
      imageUrl: validProduct.imageUrl,
      commissionType: 'percentage',
      commissionValue: 3500,
      active: true,
    });
  });
});
