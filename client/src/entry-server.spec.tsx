/// <reference types="node" />

// @vitest-environment node

import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { render, renderDocument } from './entry-server';
import type { CompanySummary } from './interfaces/company.interface';
import { calculateContrastRatio } from '../../shared/domain/color';

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

  it('renders each tenant theme in SSR without leaking colors to another tenant or the default', () => {
    const first = renderRoute('/empresa/studio-aurora', {
      ...createBusiness('Studio Aurora', 'studio-aurora'),
      primaryColor: '#123456',
      secondaryColor: '#abcdef',
    });

    const second = renderRoute('/empresa/barbearia-lunar', {
      ...createBusiness('Barbearia Lunar', 'barbearia-lunar'),
      primaryColor: '#891234',
      secondaryColor: '#fedcba',
    });

    const defaultTheme = renderRoute(
      '/empresa/sem-cores',
      createBusiness('Sem Cores', 'sem-cores'),
    );
    expect(first).toContain('--color-brand:#123456');
    expect(first).toContain('--color-promo:#abcdef');
    expect(first).not.toContain('#891234');
    expect(second).toContain('--color-brand:#891234');
    expect(second).toContain('--color-promo:#fedcba');
    expect(second).not.toContain('#123456');
    expect(defaultTheme).not.toContain('--color-brand:');
    expect(defaultTheme).not.toContain('--color-promo:');
  });

  it.each(['#000000', '#ffffff', '#ff0000', '#ffff00', '#0000ff', '#777777'])(
    'provides accessible foregrounds for customized color %s',
    (color) => {
      const html = renderRoute('/empresa/teste', {
        ...createBusiness('Teste', 'teste'),
        primaryColor: color,
        secondaryColor: color,
      });
      const style = html.match(/style="([^"]*--color-brand:[^"]*)"/)?.[1];
      expect(style).toBeDefined();
      const token = (name: string): string => {
        const value = style?.match(new RegExp(`--${name}:([^;]+)`))?.[1];
        expect(value).toBeDefined();
        return value!;
      };
      expect(calculateContrastRatio(token('color-brand-on'), color)).toBeGreaterThanOrEqual(4.5);
      expect(
        calculateContrastRatio(token('color-brand-on'), token('color-brand-hover')),
      ).toBeGreaterThanOrEqual(4.5);
      expect(calculateContrastRatio(token('color-promo-on'), color)).toBeGreaterThanOrEqual(4.5);
      expect(
        calculateContrastRatio(token('color-brand-deep'), token('color-brand-soft')),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        calculateContrastRatio(token('color-brand-ink'), token('color-brand-soft')),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        calculateContrastRatio(token('color-brand-control'), '#ffffff'),
      ).toBeGreaterThanOrEqual(3);
      expect(token('gradient-brand')).toContain(color);
      expect(token('color-brand-line')).toMatch(/^#[0-9a-f]{6}$/);
    },
  );

  it('keeps each missing color at its default and ignores another slug', () => {
    const business = createBusiness('Teste', 'teste');
    const primary = renderRoute('/empresa/teste', { ...business, primaryColor: '#123456' });
    const secondary = renderRoute('/empresa/teste', { ...business, secondaryColor: '#fedcba' });
    const wrongSlug = renderRoute('/empresa/other', { ...business, primaryColor: '#123456' });
    expect(primary).toContain('--color-brand:#123456');
    expect(primary).not.toContain('--color-promo:');
    expect(secondary).toContain('--color-promo:#fedcba');
    expect(secondary).not.toContain('--color-brand:');
    expect(wrongSlug).not.toContain('--color-brand:#123456');
  });

  it.each([
    ['#123456', '#000000'],
    ['#ffcc00', '#000080'],
    ['#ffffff', '#ff0000'],
    [undefined, '#003300'],
    ['#990000', undefined],
  ])(
    'derives a readable service-card label for primary %s and secondary %s',
    (primary, secondary) => {
      const business = createBusiness('Teste', 'teste');
      const html = renderRoute('/empresa/teste', {
        ...business,
        ...(primary ? { primaryColor: primary } : {}),
        ...(secondary ? { secondaryColor: secondary } : {}),
      });
      const style = html.match(/style="([^"]*--color-card-label:[^"]*)"/)?.[1];
      expect(style).toBeDefined();
      const label = style?.match(/--color-card-label:(#[0-9a-f]{6})/)?.[1];
      const background = style?.match(/--color-brand-ink:(#[0-9a-f]{6})/)?.[1] ?? '#061320';
      expect(calculateContrastRatio(label, background)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it('renders the same business theme on a booking page', () => {
    const output = render({
      url: '/empresa/teste/agendar/product',
      initialBusiness: {
        ...createBusiness('Teste', 'teste'),
        primaryColor: '#123456',
        secondaryColor: '#abcdef',
      },
      initialProduct: {
        id: 'product',
        name: 'Serviço',
        imageUrl: '',
        priceCents: 5000,
        durationMinutes: 30,
      },
      initialCatalogStatus: 'ready',
    });
    expect(output.appHtml).toContain('--color-brand:#123456');
    expect(output.appHtml).toContain('--color-promo:#abcdef');
  });

  it('answers 404 only for unknown public routes', () => {
    expect(render({ url: '/empresa' }).statusCode).toBe(404);
    expect(render({ url: '/empresa/studio/agendar' }).statusCode).toBe(404);
    expect(render({ url: '/outra-rota' }).statusCode).toBe(404);
    expect(render({ url: '/empresa/studio-aurora/agendar/servico' }).statusCode).toBe(200);
  });
});
