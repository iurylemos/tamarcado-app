import { describe, expect, it } from 'vitest';
import { createCompanyPwaManifest } from './pwa-manifest.service';

describe('createCompanyPwaManifest', () => {
  const business = {
    slug: 'studio-aurora',
    name: 'Studio Aurora',
    description: 'Cortes e cuidados com hora marcada.',
  };

  it('uses the business identity and limits the PWA to its catalog path segment', () => {
    const origin = 'https://tamarcado.example';
    const manifest = createCompanyPwaManifest(business, origin);

    expect(manifest.name).toBe('Studio Aurora | Tá Marcado');
    expect(manifest.short_name).toBe('Studio Aurora');
    expect(manifest.description).toBe('Cortes e cuidados com hora marcada.');
    expect(manifest.start_url).toBe(`${origin}/empresa/studio-aurora/`);
    expect(manifest.id).toBe(manifest.start_url);
    expect(manifest.scope).toBe(`${origin}/empresa/studio-aurora/`);
    expect(`${origin}/empresa/studio-aurora/agendar/corte`.startsWith(manifest.scope)).toBe(true);
    expect(`${origin}/empresa/studio-aurora-vizinha/`.startsWith(manifest.scope)).toBe(false);
    expect(`${origin}/`.startsWith(manifest.scope)).toBe(false);
  });

  it.each(['', ' ', 'studio/aurora', 'Studio-Aurora'])('rejects invalid slug %j', (slug) => {
    expect(() =>
      createCompanyPwaManifest({ ...business, slug }, 'https://tamarcado.example'),
    ).toThrow('A valid company slug is required');
  });
});
