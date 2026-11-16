type ResponsiveImageAttributes = {
  srcSet?: string;
  sizes?: string;
};

export class CatalogImageUtil {
  private static readonly widths: number[] = [320, 480, 640, 960, 1280];

  public static responsive(src: string, sizes: string): ResponsiveImageAttributes {
    if (typeof URL.canParse !== 'function' || !URL.canParse(src)) return {};

    const url = new URL(src);
    if (
      url.protocol !== 'https:' ||
      url.hostname !== 'images.unsplash.com' ||
      ['s', 'sig', 'signature', 'token', 'h', 'dpr'].some((key) => url.searchParams.has(key))
    ) {
      return {};
    }

    if (!url.searchParams.has('auto') && !url.searchParams.has('fm')) {
      url.searchParams.set('auto', 'format');
    }

    url.searchParams.set('q', '75');

    const srcSet = this.widths
      .map((width) => {
        url.searchParams.set('w', String(width));
        return `${url.href} ${width}w`;
      })
      .join(', ');

    return { srcSet, sizes };
  }
}
