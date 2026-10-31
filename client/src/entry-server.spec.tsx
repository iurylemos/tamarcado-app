// @vitest-environment node

import { once } from 'node:events';
import { Writable } from 'node:stream';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDevMiddleware, renderPage } from 'vike/server';
import { renderPublicContent } from './entry-server';
import type { CompanySummary } from './interfaces/company.interface';

const clientRoot = process.cwd();

let closeDevServer: (() => Promise<void>) | undefined;

beforeAll(async () => {
  const { viteServer } = await createDevMiddleware({ root: clientRoot });
  closeDevServer = () => viteServer.close();
});

afterAll(async () => {
  await closeDevServer?.();
});

async function renderVikePage(
  urlOriginal: string,
  initialBusiness?: CompanySummary,
): Promise<string> {
  const pageContext = await renderPage({
    urlOriginal: `http://localhost${urlOriginal}`,
    headersOriginal: { 'user-agent': 'Mozilla/5.0' },
    ...(initialBusiness ? { initialBusiness, initialCatalogStatus: 'ready' as const } : {}),
  });

  if (!pageContext.httpResponse) throw new Error(`No HTTP response for ${urlOriginal}`);

  const chunks: Buffer[] = [];
  const destination = new Writable({
    write(chunk: Buffer | string, _encoding, callback) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      callback();
    },
  });

  pageContext.httpResponse.pipe(destination);
  await once(destination, 'finish');

  return Buffer.concat(chunks).toString('utf8');
}

function createBusiness(name: string, slug: string): CompanySummary {
  return { id: slug, name, slug, segment: 'beauty' };
}

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

describe('Vike SSR integration', () => {
  it('renders neutral root guidance and React Query hydration markup', async () => {
    const markup = await renderVikePage('/');

    expect(markup).toContain('Acesse o catálogo do seu negócio');
    expect(markup).toContain('class="_rqd_"');
  });

  it('keeps an uninjected Vike dev request loading until the browser fetches its catalog', async () => {
    const markup = await renderVikePage('/empresa/studio-aurora');

    expect(markup).toContain('Carregando catálogo...');
    expect(markup).not.toContain('Empresa não encontrada.');
  });

  it('keeps concurrent tenant renders isolated and renders each business name', async () => {
    const [studio, barbershop] = await Promise.all([
      renderVikePage('/empresa/studio-aurora', createBusiness('Studio Aurora', 'studio-aurora')),
      renderVikePage(
        '/empresa/barbearia-lunar',
        createBusiness('Barbearia Lunar', 'barbearia-lunar'),
      ),
    ]);

    expect(studio).toContain('Studio Aurora');
    expect(studio).not.toContain('Barbearia Lunar');
    expect(barbershop).toContain('Barbearia Lunar');
    expect(barbershop).not.toContain('Studio Aurora');
  });
});
