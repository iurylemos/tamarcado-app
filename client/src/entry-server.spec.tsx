/// <reference types="node" />

// @vitest-environment node

import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { render, renderDocument } from './entry-server';
import type { CompanySummary } from './interfaces/company.interface';

vi.mock('./config/firebase.config', () => ({ db: {}, functions: {}, auth: {} }));

const template = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function createBusiness(name: string, slug: string): CompanySummary {
  return { id: slug, name, slug, segment: 'beauty' };
}

function renderRoute(url: string, business?: CompanySummary): string {
  return renderDocument(
    template,
    render({
      url,
      ...(business ? { initialBusiness: business, initialCatalogStatus: 'ready' as const } : {}),
    }),
  );
}

describe('storefront SSR', () => {
  it('renders neutral root guidance with static metadata and no hydration state', () => {
    const html = renderRoute('/');

    expect(html).toContain('Acesse o catálogo do seu negócio');
    expect(html).toContain('<title>Tá Marcado | Catálogos e agendamentos</title>');
    expect(html).toContain('name="description"');
    expect(html).not.toContain('__STOREFRONT_STATE__');
    expect(html).not.toContain('<!--app-');
  });

  it('keeps a request without injected data loading until the browser fetches its catalog', () => {
    const html = renderRoute('/empresa/studio-aurora');

    expect(html).toContain('Carregando catálogo...');
    expect(html).not.toContain('Empresa não encontrada.');
  });

  it('renders escaped dynamic metadata and serializes the public initial data safely', () => {
    const html = renderRoute('/empresa/studio-aurora', {
      ...createBusiness('Studio <Aurora> & "Cia"', 'studio-aurora'),
      logoUrl: 'https://cdn.test/logo.png?a=1&b=2',
    });

    expect(html).toContain(
      '<title>Studio &lt;Aurora&gt; &amp; &quot;Cia&quot; | Tá Marcado</title>',
    );
    expect(html).toContain(
      '<link rel="canonical" href="https://tamarcado-dad82.web.app/empresa/studio-aurora"',
    );
    expect(html).toContain(
      'property="og:url" content="https://tamarcado-dad82.web.app/empresa/studio-aurora"',
    );
    expect(html).toContain('property="og:image" content="https://cdn.test/logo.png?a=1&amp;b=2"');
    expect(html).toContain('id="__STOREFRONT_STATE__" type="application/json"');
    expect(html).not.toContain('<Aurora>');
    expect(html).toContain('\\u003cAurora>');
  });

  it('renders distinct canonical metadata for two tenant slugs', () => {
    const studio = renderRoute(
      '/empresa/studio-aurora',
      createBusiness('Studio Aurora', 'studio-aurora'),
    );
    const barbershop = renderRoute(
      '/empresa/barbearia-lunar',
      createBusiness('Barbearia Lunar', 'barbearia-lunar'),
    );

    expect(studio).toContain('Studio Aurora');
    expect(studio).not.toContain('Barbearia Lunar');
    expect(studio).toContain('/empresa/studio-aurora');
    expect(studio).not.toContain('/empresa/barbearia-lunar');
    expect(barbershop).toContain('Barbearia Lunar');
    expect(barbershop).not.toContain('Studio Aurora');
    expect(barbershop).toContain('/empresa/barbearia-lunar');
    expect(barbershop).not.toContain('/empresa/studio-aurora');
  });

  it('answers 404 only for unknown public routes', () => {
    expect(render({ url: '/empresa' }).statusCode).toBe(404);
    expect(render({ url: '/empresa/studio/agendar' }).statusCode).toBe(404);
    expect(render({ url: '/outra-rota' }).statusCode).toBe(404);
    expect(render({ url: '/empresa/studio-aurora/agendar/servico' }).statusCode).toBe(200);
  });
});
