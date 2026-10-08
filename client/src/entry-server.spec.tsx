import { describe, expect, it } from 'vitest';
import { renderPublicContent } from './entry-server';

describe('renderPublicContent', () => {
  it('server-renders the same crawlable catalog links as the client template', () => {
    const markup = renderPublicContent({
      business: {
        id: 'tenant-aurora',
        name: 'Studio Aurora',
        slug: 'studio-aurora',
        segment: 'beauty',
      },
      products: [
        {
          id: 'service-corte',
          name: 'Corte e finalização',
          imageUrl: '/corte.jpg',
          priceCents: 12000,
          durationMinutes: 60,
        },
      ],
    });

    expect(markup).toContain('<h1>Studio Aurora</h1>');
    expect(markup).toContain('href="/empresa/studio-aurora/agendar/service-corte"');
    expect(markup).toContain('Corte e finalização');
  });
});
