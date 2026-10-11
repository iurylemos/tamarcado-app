import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveProductPriceCents } from '../../../shared/domain/product-price';
import { collections } from '../../src/config/collections';
import { parseCompanyCsv } from './company-import-csv';
import { executeCompanyImport } from './import-company';
import { fakeImportDependencies, validImportData } from './company-import-test-helpers';

describe('company import catalog', () => {
  it('publishes tenant-scoped products with the default variant and exact prices in cents', async () => {
    const data = validImportData();
    const fake = fakeImportDependencies();
    const summary = await executeCompanyImport(data, fake.dependencies);
    const product = fake.storedDocuments.get(`${collections.products}/cabec`);
    const publicProduct = fake.storedDocuments.get(`${collections.publicProducts}/cabec`);

    expect(product).toMatchObject({
      tenantId: 'soft-stylus',
      priceCents: 35000,
      commissionType: 'fixed',
      commissionValue: 0,
      active: true,
      customizationAttributes: [
        {
          id: 'variacao',
          label: 'Variacao',
          defaultOptionId: 'solteiro-rosa',
          options: [
            { id: 'solteiro-rosa', label: 'Solteiro Rosa' },
            { id: 'casal-preta', label: 'Casal Preta' },
          ],
        },
      ],
      variantPrices: [
        {
          selections: [{ attributeId: 'variacao', optionId: 'solteiro-rosa' }],
          priceCents: 35000,
        },
        {
          selections: [{ attributeId: 'variacao', optionId: 'casal-preta' }],
          priceCents: 45000,
        },
      ],
    });
    expect(publicProduct).toMatchObject({
      tenantId: 'soft-stylus',
      businessSlug: 'soft-stylus',
      published: true,
      variantPrices: product?.variantPrices,
    });
    expect(summary).toMatchObject({ products: 1, variants: 2, collaborators: 1 });
  });

  it('imports Soft Stylus combo choices and all 432 exact prices without operational credentials', async () => {
    const template = await readFile(
      resolve(process.cwd(), 'test/fixtures/templates/soft-stylus.example.csv'),
      'utf8',
    );
    const [headerLine, ...rows] = template
      .replace(/^\uFEFF/, '')
      .trim()
      .split(/\r?\n/);
    const headers = headerLine!.split(';');
    const originalRows = rows.map((line) => line.split(';'));
    const filledRows = rows.map((line) => {
      const fields = line.split(';');
      const recordType = fields[0];
      if (recordType === 'empresa') fields[22] = 'temporary-admin-password';
      if (recordType === 'colaborador') {
        fields[6] = '(11) 99999-9999';
        fields[8] = 'temporary-staff-password';
      }
      return fields.join(';');
    });
    const parsed = parseCompanyCsv([headers.join(';'), ...filledRows].join('\n'));

    expect(parsed.products).toHaveLength(8);
    expect(
      parsed.products.reduce(
        (total, product) => total + (product.variantPrices?.length ?? product.variants.length),
        0,
      ),
    ).toBe(465);
    const combo = parsed.products.find((product) => product.id === 'sofa-poltronas')!;
    expect(combo.customizationAttributes?.map(({ id }) => id)).toEqual([
      'sofa-fabric',
      'sofa-color',
      'sofa-seats',
      'chair-fabric',
      'chair-color',
      'chair-model',
      'chair-quantity',
    ]);
    expect(combo.variantPrices).toHaveLength(432);
    const resolveComboPrice = (selections: Array<{ attributeId: string; optionId: string }>) =>
      resolveProductPriceCents(
        Math.min(...combo.variantPrices!.map(({ priceCents }) => priceCents)),
        combo.variantPrices,
        selections,
      );
    const twoSeatTwoChairSelections = [
      { attributeId: 'sofa-fabric', optionId: 'fabric-suede' },
      { attributeId: 'sofa-color', optionId: 'color-cinza' },
      { attributeId: 'sofa-seats', optionId: 'seats-two' },
      { attributeId: 'chair-fabric', optionId: 'chair-fabric-linho' },
      { attributeId: 'chair-color', optionId: 'chair-color-preto' },
      { attributeId: 'chair-model', optionId: 'chair-individual' },
      { attributeId: 'chair-quantity', optionId: 'chairs-two' },
    ];
    expect(resolveComboPrice(twoSeatTwoChairSelections)).toBe(300000);
    expect(
      resolveComboPrice([
        { attributeId: 'sofa-fabric', optionId: 'fabric-linho' },
        { attributeId: 'sofa-color', optionId: 'color-bege' },
        { attributeId: 'sofa-seats', optionId: 'seats-two' },
        { attributeId: 'chair-fabric', optionId: 'chair-fabric-suede' },
        { attributeId: 'chair-color', optionId: 'chair-color-bege' },
        { attributeId: 'chair-model', optionId: 'chair-individual' },
        { attributeId: 'chair-quantity', optionId: 'chairs-two' },
      ]),
    ).toBe(300000);
    expect(
      resolveComboPrice(
        twoSeatTwoChairSelections.map((selection) =>
          selection.attributeId === 'chair-quantity'
            ? { ...selection, optionId: 'chairs-one' }
            : selection,
        ),
      ),
    ).toBe(235000);
    expect(
      parsed.products.flatMap((product) => product.variants.map((variant) => variant.priceCents)),
    ).toEqual([
      35000, 45000, 45000, 45000, 45000, 55000, 55000, 55000, 55000, 75000, 90000, 95000, 125000,
      165000, 210000, 35000, 45000, 60000, 80000, 70000, 95000, 120000, 150000, 170000, 230000,
      320000, 65000, 85000, 70000, 25000, 28000, 35000, 40000,
    ]);
    const templateCompany = originalRows.find((fields) => fields[0] === 'empresa')!;
    const templateStaff = originalRows.find((fields) => fields[0] === 'colaborador')!;
    expect(templateCompany[22]).toBe('');
    expect(templateStaff[6]).toBe('');
    expect(templateStaff[8]).toBe('');
    expect(rows.join('\n')).not.toMatch(/\+55\d{10,11}/);
    expect(parsed.company.adminEmail).toBe('admin@softstylus.com');
    expect(parsed.staff[0]?.email).toBe('italo@softstylus.com');

    const fake = fakeImportDependencies();
    const summary = await executeCompanyImport(parsed, fake.dependencies);
    const importedCombo = fake.storedDocuments.get(`${collections.products}/sofa-poltronas`);
    expect(importedCombo).toMatchObject({
      priceCents: 235000,
      customizationAttributes: combo.customizationAttributes,
      variantPrices: combo.variantPrices,
    });
    expect(summary).toMatchObject({ products: 8, variants: 465 });
  });
});
