import { describe, expect, it } from 'vitest';
import { collections } from '../../src/config/collections';
import { executeCompanyImport } from './import-company';
import { fakeImportDependencies, validImportData } from './company-import-test-helpers';

describe('company import safety', () => {
  it('does not overwrite a pre-existing document and never deletes it during recovery', async () => {
    const existing = {
      collection: collections.products,
      id: 'cabec',
      data: { tenantId: 'another-tenant', name: 'Existing product' },
    };
    const fake = fakeImportDependencies({ existingDocument: existing });

    await expect(executeCompanyImport(validImportData(), fake.dependencies)).rejects.toThrow(
      /conflito com registro existente.*produto "cabec"/i,
    );
    expect(fake.storedDocuments.get(`${collections.products}/cabec`)).toEqual(existing.data);
    expect(fake.deletedDocuments).not.toContain(`${collections.products}/cabec`);
  });

  it('preserves a pre-existing Auth account when its email conflicts', async () => {
    const existing = {
      uid: 'existing-admin',
      email: 'admin@softstylus.com',
      password: 'unchanged-secret',
    };
    const fake = fakeImportDependencies({ existingUser: existing });

    await expect(executeCompanyImport(validImportData(), fake.dependencies)).rejects.toThrow(
      /conflito com registro existente.*administrador "soft-stylus"/i,
    );
    expect(fake.storedUsers.get(existing.uid)).toEqual({
      email: existing.email,
      password: existing.password,
    });
    expect(fake.deletedUsers).not.toContain(existing.uid);
  });

  it('rolls back only current-attempt records and sanitizes failures and success reports', async () => {
    const data = validImportData();
    const fake = fakeImportDependencies({
      failDocumentCollection: collections.professionalProducts,
    });

    let failure = '';
    try {
      await executeCompanyImport(data, fake.dependencies);
    } catch (error) {
      failure = error instanceof Error ? error.message : String(error);
    }

    expect(failure).toContain('associação de produto "soft-stylus__italo__cabec"');
    expect(failure).not.toContain(data.company.adminPassword);
    expect(failure).not.toContain(data.staff[0]!.password);
    expect(failure).not.toContain(data.staff[0]!.phoneE164);
    expect(failure).not.toContain('provider error must not leak');
    expect(fake.storedDocuments.size).toBe(0);
    expect(fake.storedUsers.size).toBe(0);
    expect(fake.deletedUsers).toHaveLength(2);

    const completed = fakeImportDependencies();
    const summary = await executeCompanyImport(data, completed.dependencies);
    expect(JSON.stringify(summary)).not.toContain(data.company.adminPassword);
    expect(JSON.stringify(summary)).not.toContain(data.staff[0]!.password);
    expect(JSON.stringify(summary)).not.toContain(data.staff[0]!.phoneE164);
  });

  it('uses create-only APIs and does not expose preflight reads', async () => {
    const fake = fakeImportDependencies();
    expect(Object.keys(fake.dependencies.documents).sort()).toEqual(['create', 'delete']);
    await executeCompanyImport(validImportData(), fake.dependencies);
  });
});
