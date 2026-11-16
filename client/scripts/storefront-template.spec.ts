import { describe, expect, it } from 'vitest';
import { inlineStylesheet } from '../vite.config';

describe('inlineStylesheet', () => {
  it('replaces the initial stylesheet request with its built CSS', () => {
    const html =
      '<!doctype html><html><head><link rel="stylesheet" crossorigin href="/assets/index.css"></head></html>';

    expect(inlineStylesheet(html, 'body{color:#123}')).toBe(
      '<!doctype html><html><head><style>body{color:#123}</style></head></html>',
    );
  });

  it('rejects templates without exactly one initial stylesheet', () => {
    expect(() => inlineStylesheet('<html><head></head></html>', '')).toThrow(
      'Expected exactly one initial stylesheet',
    );
    expect(() =>
      inlineStylesheet(
        '<link rel="stylesheet" href="/one.css"><link rel="stylesheet" href="/two.css">',
        '',
      ),
    ).toThrow('Expected exactly one initial stylesheet');
  });
});
