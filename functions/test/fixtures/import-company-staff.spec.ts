import { describe, expect, it, vi } from 'vitest';
import { collections } from '../../src/config/collections';
import { parseCompanyCsv } from './company-import-csv';
import { executeCompanyImport } from './import-company';
import { fakeImportDependencies, validImportData } from './company-import-test-helpers';

const csvHeaders = [
  'tipo',
  'id',
  'nome',
  'slug',
  'segmento',
  'descricao',
  'telefone',
  'email',
  'senha_inicial',
  'dominio_email',
  'fuso',
  'intervalo_agendamento',
  'dias_semana',
  'inicio',
  'fim',
  'produto_id',
  'duracao_minutos',
  'imagem_url',
  'variacao',
  'preco',
  'nome_admin',
  'email_admin',
  'senha_admin',
] as const;

function csvRow(values: Partial<Record<(typeof csvHeaders)[number], string>>): string {
  return csvHeaders.map((header) => values[header] ?? '').join(';');
}

describe('company import staff', () => {
  it('creates scoped staff accounts, professional profiles, assignments, and weekly hours', async () => {
    const data = validImportData();
    const fake = fakeImportDependencies();
    await executeCompanyImport(data, fake.dependencies);

    const professional = fake.storedDocuments.get(`${collections.professionals}/italo`);
    expect(professional).toMatchObject({
      tenantId: 'soft-stylus',
      name: 'Italo',
      phoneE164: '+5585999990000',
      active: true,
    });
    expect([...fake.storedDocuments.values()]).toContainEqual(
      expect.objectContaining({
        tenantId: 'soft-stylus',
        role: 'collaborator',
        professionalId: 'italo',
      }),
    );
    expect([...fake.claims.values()]).toContainEqual(
      expect.objectContaining({
        tenantId: 'soft-stylus',
        role: 'collaborator',
        professionalId: 'italo',
      }),
    );
    expect(
      fake.storedDocuments.get(`${collections.professionalProducts}/soft-stylus__italo__cabec`),
    ).toMatchObject({ active: true, productId: 'cabec', professionalId: 'italo' });
    expect(
      [...fake.storedDocuments.values()].filter(
        (document) => document.professionalId === 'italo' && 'dayOfWeek' in document,
      ),
    ).toHaveLength(6);
  });

  it('rejects invalid staff data before any Firebase write', async () => {
    const companyRow = csvRow({
      tipo: 'empresa',
      id: 'soft-stylus',
      nome: 'Soft Stylus',
      slug: 'soft-stylus',
      segmento: 'home',
      dominio_email: 'softstylus.com',
      fuso: 'America/Fortaleza',
      intervalo_agendamento: '30',
      dias_semana: '1,2,3,4,5,6',
      inicio: '09:00',
      fim: '18:00',
      nome_admin: 'Gestor',
      email_admin: 'admin@softstylus.com',
      senha_admin: 'admin-secret',
    });
    const validStaff = {
      tipo: 'colaborador',
      id: 'italo',
      nome: 'Italo',
      telefone: '(85) 99999-0000',
      email: 'italo@softstylus.com',
      senha_inicial: 'staff-secret',
    };
    const fake = fakeImportDependencies();
    const createDocument = vi.spyOn(fake.dependencies.documents, 'create');

    for (const changes of [
      { id: '' },
      { telefone: '123' },
      { email: '' },
      { email: 'italo@outside.com' },
      { senha_inicial: 'short' },
    ]) {
      const staffRow = csvRow({ ...validStaff, ...changes });
      await expect(
        Promise.resolve().then(() =>
          executeCompanyImport(
            parseCompanyCsv([csvHeaders.join(';'), companyRow, staffRow].join('\n')),
            fake.dependencies,
          ),
        ),
      ).rejects.toThrow(/linha 3/i);
    }

    expect(createDocument).not.toHaveBeenCalled();
  });
});
