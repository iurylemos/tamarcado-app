// @vitest-environment node

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type HostingHeader = {
  source: string;
  headers: Array<{ key: string; value: string }>;
};

describe('client Hosting cache configuration', () => {
  it('keeps hashed assets immutable and storefront documents revalidatable', () => {
    const config = JSON.parse(
      readFileSync(new URL('../../firebase.json', import.meta.url), 'utf8'),
    );
    const hosting = config.hosting.find(
      (site: { site: string }) => site.site === 'tamarcado-dad82',
    );
    const headers: HostingHeader[] = hosting.headers;
    const cacheControl = (source: string): string | undefined =>
      headers
        .find((header) => header.source === source)
        ?.headers.find((header) => header.key === 'Cache-Control')?.value;

    expect(cacheControl('/assets/**')).toBe('public,max-age=31536000,immutable');
    for (const source of ['/', '/empresa/**', '/booking-shell.html']) {
      expect(cacheControl(source)).toBe('no-cache');
    }
  });
});
