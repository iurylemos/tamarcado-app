import { describe, expect, it } from 'vitest';
import { normalizeCollaboratorEmail, validatePassword } from './collaborator-account.service';

describe('collaborator account rules', () => {
  it('accepts only e-mails from the company domain', () => {
    expect(normalizeCollaboratorEmail(' Fulano@VitoriaCilios.com ', 'vitoriacilios.com')).toBe(
      'fulano@vitoriacilios.com',
    );
    expect(() => normalizeCollaboratorEmail('fulano@gmail.com', 'vitoriacilios.com')).toThrow(
      /@vitoriacilios.com/,
    );
    expect(() => normalizeCollaboratorEmail('invalido', 'vitoriacilios.com')).toThrow();
  });

  it('requires the company domain to be configured', () => {
    expect(() => normalizeCollaboratorEmail('a@b.com', undefined)).toThrow(/domínio/);
  });

  it('enforces password length', () => {
    expect(() => validatePassword('curta')).toThrow();
    expect(validatePassword('senha-forte-1')).toBe('senha-forte-1');
  });
});
