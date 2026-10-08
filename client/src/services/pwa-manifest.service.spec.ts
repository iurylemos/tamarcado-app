import { describe, expect, it } from 'vitest';
import { createCompanyPwaManifest } from './pwa-manifest.service';

describe('createCompanyPwaManifest', () => {
  it('uses the company catalog as the PWA entry and scopes it to this origin', () => {
    const manifest = createCompanyPwaManifest('studio-aurora', 'https://tamarcado.example');

    expect(manifest.start_url).toBe('https://tamarcado.example/empresa/studio-aurora');
    expect(manifest.id).toBe(manifest.start_url);
    expect(manifest.scope).toBe('https://tamarcado.example/');
  });

  it('rejects a missing company slug', () => {
    expect(() => createCompanyPwaManifest(' ', 'https://tamarcado.example')).toThrow(
      'A company slug is required',
    );
  });
});
