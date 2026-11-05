import { describe, expect, it } from 'vitest';
import { matchRoute } from './routes';

describe('matchRoute', () => {
  it('matches the public storefront routes', () => {
    expect(matchRoute('/')).toEqual({ name: 'home' });
    expect(matchRoute('/empresa/studio-aurora')).toEqual({
      name: 'catalog',
      slug: 'studio-aurora',
    });
    expect(matchRoute('/empresa/studio-aurora/')).toEqual({
      name: 'catalog',
      slug: 'studio-aurora',
    });
    expect(matchRoute('/empresa/studio-aurora/agendar/servi%C3%A7o')).toEqual({
      name: 'booking',
      slug: 'studio-aurora',
      productId: 'serviço',
    });
  });

  it('rejects unknown or malformed routes', () => {
    expect(matchRoute('/empresa')).toEqual({ name: 'not-found' });
    expect(matchRoute('/empresa/%E0%A4%A')).toEqual({ name: 'not-found' });
    expect(matchRoute('/empresa/x/agendar')).toEqual({ name: 'not-found' });
    expect(matchRoute('/empresa/x/outro/y')).toEqual({ name: 'not-found' });
    expect(matchRoute('/admin')).toEqual({ name: 'not-found' });
  });
});
