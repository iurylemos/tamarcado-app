import { describe, expect, it } from 'vitest';
import { collections } from '../../src/config/collections';
import {
  executeCompanyImport,
  parseImportArguments,
  resolveCompanyCsvPath,
} from './import-company';
import { fakeImportDependencies, validImportData } from './company-import-test-helpers';

describe('parseImportArguments', () => {
  it('requires explicit production confirmation, project, and file arguments', () => {
    expect(() => parseImportArguments([])).toThrow(/--project/i);
    expect(() => parseImportArguments(['--project', 'tamarcado-prod'])).toThrow(/--file/i);
    expect(() =>
      parseImportArguments(['--project', 'tamarcado-prod', '--file', 'company.csv']),
    ).toThrow(/confirm-production-import/i);
  });

  it('accepts all required arguments', () => {
    expect(
      parseImportArguments([
        '--project',
        'tamarcado-prod',
        '--file',
        'company.csv',
        '--confirm-production-import',
      ]),
    ).toEqual({ projectId: 'tamarcado-prod', fileName: 'company.csv' });
  });

  it('resolves only a CSV filename under the Functions templates directory', () => {
    expect(resolveCompanyCsvPath('soft-stylus.csv', 'C:\\repo\\functions')).toBe(
      'C:\\repo\\functions\\test\\fixtures\\templates\\soft-stylus.csv',
    );
    expect(() => resolveCompanyCsvPath('..\\private\\company.csv', 'C:\\repo\\functions')).toThrow(
      /somente o nome do arquivo/i,
    );
    expect(() => resolveCompanyCsvPath('company.txt', 'C:\\repo\\functions')).toThrow(/\.csv/i);
  });

  it('rejects demo projects and Firebase emulator environments', () => {
    const args = [
      '--project',
      'demo-tamarcado',
      '--file',
      'company.csv',
      '--confirm-production-import',
    ];
    expect(() => parseImportArguments(args)).toThrow(/demo-/i);
    expect(() =>
      parseImportArguments(
        ['--project', 'tamarcado-prod', '--file', 'company.csv', '--confirm-production-import'],
        { FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' },
      ),
    ).toThrow(/emulador/i);
  });

  it('creates one published tenant and a tenant-scoped administrator without staff or products', async () => {
    const data = validImportData();
    data.staff = [];
    data.products = [];
    const fake = fakeImportDependencies();

    const result = await executeCompanyImport(data, fake.dependencies);

    expect(fake.storedDocuments.get(`${collections.tenants}/soft-stylus`)).toMatchObject({
      name: 'Soft Stylus',
      slug: 'soft-stylus',
      active: true,
    });
    expect(fake.storedDocuments.get(`${collections.publicBusinesses}/soft-stylus`)).toMatchObject({
      tenantId: 'soft-stylus',
      published: true,
    });
    expect([...fake.claims.values()]).toEqual([
      { tenantId: 'soft-stylus', role: 'backoffice', active: true },
    ]);
    expect([...fake.storedDocuments.values()]).toContainEqual(
      expect.objectContaining({ tenantId: 'soft-stylus', role: 'backoffice' }),
    );
    expect(result).toMatchObject({ collaborators: 0, products: 0, accounts: 1 });
  });

  it('rejects a tenant document already keyed by the same slug', async () => {
    const fake = fakeImportDependencies({
      existingDocument: {
        collection: collections.tenants,
        id: 'soft-stylus',
        data: { slug: 'soft-stylus', name: 'Existing business' },
      },
    });

    await expect(executeCompanyImport(validImportData(), fake.dependencies)).rejects.toThrow(
      /conflito com registro existente.*empresa "soft-stylus"/i,
    );
    expect(fake.storedDocuments.get(`${collections.tenants}/soft-stylus`)).toEqual({
      slug: 'soft-stylus',
      name: 'Existing business',
    });
    expect(fake.deletedDocuments).not.toContain(`${collections.tenants}/soft-stylus`);
  });
});
