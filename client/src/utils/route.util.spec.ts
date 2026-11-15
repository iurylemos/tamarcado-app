import { describe, expect, it } from 'vitest';
import { RouteUtil } from './route.util';

describe('matchRoute', () => {
  it('matches the public storefront routes', () => {
    expect(RouteUtil.matchRoute('/')).toEqual({ name: 'home' });
    expect(RouteUtil.matchRoute('/empresa/studio-aurora')).toEqual({
      name: 'catalog',
      slug: 'studio-aurora',
    });
    expect(RouteUtil.matchRoute('/empresa/studio-aurora/')).toEqual({
      name: 'catalog',
      slug: 'studio-aurora',
    });
    expect(RouteUtil.matchRoute('/empresa/studio-aurora/agendar/servi%C3%A7o')).toEqual({
      name: 'booking',
      slug: 'studio-aurora',
      productId: 'serviço',
    });
  });

  it('rejects unknown or malformed routes', () => {
    expect(RouteUtil.matchRoute('/empresa')).toEqual({ name: 'not-found' });
    expect(RouteUtil.matchRoute('/empresa/%E0%A4%A')).toEqual({ name: 'not-found' });
    expect(RouteUtil.matchRoute('/empresa/x/agendar')).toEqual({ name: 'not-found' });
    expect(RouteUtil.matchRoute('/empresa/x/outro/y')).toEqual({ name: 'not-found' });
    expect(RouteUtil.matchRoute('/admin')).toEqual({ name: 'not-found' });
  });
});
