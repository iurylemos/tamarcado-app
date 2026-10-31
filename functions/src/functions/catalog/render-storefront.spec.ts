import { Writable } from 'node:stream';
import { once } from 'node:events';
import { logger } from 'firebase-functions';
import type { Request } from 'firebase-functions/v2/https';
import type { Response } from 'firebase-functions/v1';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DomainError } from '../../../../shared/domain/errors';
import { findPublicBusiness, findPublicProductRecord } from '../../services/public-catalog.service';
import { renderStorefront } from './render-storefront';

vi.mock('../../services/public-catalog.service', () => ({
  findPublicBusiness: vi.fn(),
  findPublicProductRecord: vi.fn(),
}));

class TestResponse extends Writable {
  public statusCode = 200;
  public body = '';
  public readonly headers = new Map<string, string>();

  public status(code: number): this {
    this.statusCode = code;
    return this;
  }

  public set(name: string, value: string): this {
    this.headers.set(name.toLowerCase(), value);
    return this;
  }

  public type(value: string): this {
    this.set('Content-Type', value);
    return this;
  }

  public send(body: string): this {
    this.end(body);
    return this;
  }

  public override _write(
    chunk: Buffer | string,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    this.body += chunk.toString();
    callback();
  }
}

const businesses = {
  'studio-aurora': {
    id: 'public-studio-aurora',
    tenantId: 'private-tenant-aurora',
    name: 'Studio Aurora',
    slug: 'studio-aurora',
    segment: 'beauty' as const,
    published: true,
  },
  'barbearia-lunar': {
    id: 'public-barbearia-lunar',
    tenantId: 'private-tenant-lunar',
    name: 'Barbearia Lunar',
    slug: 'barbearia-lunar',
    segment: 'beauty' as const,
    published: true,
  },
};

const products = {
  'studio-aurora': [
    {
      id: 'service-corte',
      tenantId: 'private-tenant-aurora',
      businessSlug: 'studio-aurora',
      name: 'Corte e finalização',
      imageUrl: '/corte.jpg',
      priceCents: 12000,
      durationMinutes: 60,
      active: true,
      published: true,
    },
  ],
  'barbearia-lunar': [
    {
      id: 'service-barba',
      tenantId: 'private-tenant-lunar',
      businessSlug: 'barbearia-lunar',
      name: 'Barba',
      imageUrl: '/barba.jpg',
      priceCents: 8000,
      durationMinutes: 45,
      active: true,
      published: true,
    },
  ],
};

function createRequest(url: string): Request {
  const headers: Record<string, string> = {
    host: 'storefront.test',
    'user-agent': 'Mozilla/5.0',
  };

  return {
    path: new URL(url, 'http://storefront.test').pathname,
    originalUrl: url,
    url,
    protocol: 'http',
    hostname: 'storefront.test',
    get: (name: string) => headers[name.toLowerCase()],
  } as unknown as Request;
}

async function requestStorefront(url: string): Promise<TestResponse> {
  const response = new TestResponse();
  const finished = once(response, 'finish');

  await renderStorefront(createRequest(url), response as unknown as Response);
  await finished;

  return response;
}

beforeEach(() => {
  vi.mocked(findPublicBusiness).mockImplementation(async (slug) => {
    const business = businesses[slug as keyof typeof businesses];
    if (!business) throw new DomainError('NOT_FOUND', 'Empresa não encontrada.');
    return business;
  });
  vi.mocked(findPublicProductRecord).mockImplementation(async (slug, productId) => {
    return (
      products[slug as keyof typeof products]?.find((product) => product.id === productId) ?? null
    );
  });
});

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe('renderStorefront', () => {
  it('server-renders neutral root guidance without loading business data', async () => {
    const response = await requestStorefront('/');

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Acesse o catálogo do seu negócio');
    expect(response.body).toContain('rel="icon"');
    expect(response.body).toContain('rel="apple-touch-icon"');
    expect(response.body).toContain('href="/pwa-icon.svg"');
    expect(response.body).toContain('property="og:site_name"');
    expect(response.body).toContain('name="twitter:card"');
    expect(response.body).toContain('name="theme-color"');
    expect(response.body).toContain('<title>Tá Marcado | Catálogos e agendamentos</title>');
    expect(findPublicBusiness).not.toHaveBeenCalled();
  });

  it('renders only the published catalog selected by its slug and hydrates its query', async () => {
    const response = await requestStorefront('/empresa/studio-aurora');

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Studio Aurora');
    expect(response.body).not.toContain('Corte e finalização');
    expect(response.body).toContain('<title>Studio Aurora | Tá Marcado</title>');
    expect(response.body).toContain('class="_rqd_"');
    expect(response.body).toContain('application/json');
    expect(response.body).not.toContain('private-tenant-aurora');
  });

  it('server-renders a published booking route with its matching public service', async () => {
    const response = await requestStorefront('/empresa/studio-aurora/agendar/service-corte');

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Studio Aurora');
    expect(response.body).toContain('Corte e finalização');
    expect(response.body).toContain('Agende Corte e finalização');
    expect(response.body).not.toContain('private-tenant-aurora');
  });

  it('returns a public not-found state for an unknown slug', async () => {
    const response = await requestStorefront('/empresa/inexistente');

    expect(response.statusCode).toBe(404);
    expect(response.body).toContain('Empresa não encontrada.');
    expect(response.body).not.toContain('Studio Aurora');
  });

  it('returns a not-found state when a booking service does not belong to the requested business', async () => {
    const response = await requestStorefront('/empresa/studio-aurora/agendar/service-barba');

    expect(response.statusCode).toBe(404);
    expect(response.body).toContain('Serviço não encontrado.');
    expect(response.body).not.toContain('Barbearia Lunar');
  });

  it('keeps simultaneous requests for different tenants isolated', async () => {
    const [studio, barbershop] = await Promise.all([
      requestStorefront('/empresa/studio-aurora'),
      requestStorefront('/empresa/barbearia-lunar'),
    ]);

    expect(studio.body).toContain('Studio Aurora');
    expect(studio.body).not.toContain('Barbearia Lunar');
    expect(barbershop.body).toContain('Barbearia Lunar');
    expect(barbershop.body).not.toContain('Studio Aurora');
  });

  it('logs sanitized metadata and renders an actionable state when catalog data fails', async () => {
    vi.mocked(findPublicBusiness).mockRejectedValue(
      new Error('Fake Customer fake@example.test secret-token'),
    );
    const errorLog = vi.spyOn(logger, 'error').mockImplementation(() => undefined);

    const response = await requestStorefront('/empresa/studio-aurora');

    expect(response.statusCode).toBe(500);
    expect(response.body).toContain('Não foi possível carregar este catálogo.');
    expect(errorLog).toHaveBeenCalledWith('operation.unexpected_failure', {
      functionName: 'renderStorefront',
      operation: 'storefront_render',
      stage: 'render',
      outcome: 'failure',
      errorCategory: 'unexpected',
    });
    expect(JSON.stringify(errorLog.mock.calls)).not.toMatch(
      /Fake Customer|fake@example\.test|secret-token/,
    );
  });
});
