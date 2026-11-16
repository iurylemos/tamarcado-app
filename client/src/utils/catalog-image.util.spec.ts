import { describe, expect, it } from 'vitest';
import { CatalogImageUtil } from './catalog-image.util';

describe('CatalogImageUtil', () => {
  it('creates responsive Unsplash variants while retaining image parameters', () => {
    const result = CatalogImageUtil.responsive(
      'https://images.unsplash.com/photo-example?auto=format&fit=crop&w=900&q=85&ixid=example',
      '50vw',
    );

    expect(result.sizes).toBe('50vw');
    const candidates = result.srcSet?.split(', ') ?? [];
    expect(candidates).toHaveLength(5);
    for (const [index, width] of [320, 480, 640, 960, 1280].entries()) {
      const [source, descriptor] = candidates[index].split(' ');
      const url = new URL(source);
      expect(url.searchParams.get('w')).toBe(String(width));
      expect(url.searchParams.get('auto')).toBe('format');
      expect(url.searchParams.get('q')).toBe('75');
      expect(url.searchParams.get('ixid')).toBe('example');
      expect(descriptor).toBe(`${width}w`);
    }
  });

  it('leaves storage, signed, fixed-height and invalid URLs unchanged', () => {
    for (const url of [
      'https://firebasestorage.googleapis.com/v0/b/example/o/image?alt=media',
      'https://images.unsplash.com/photo-example?w=900&s=signature',
      'https://images.unsplash.com/photo-example?w=900&h=600',
      '/local-image.jpg',
      'invalid url',
    ]) {
      expect(CatalogImageUtil.responsive(url, '50vw')).toEqual({});
    }
  });
});
