export class ReactQueryConfig {
  public static readonly companyCatalogKey: string = 'company-catalog';
  public static readonly availabilityKey: string = 'availability';
  public static readonly availabilitySearchKey: string = 'availability-search';
  public static readonly queryStaleTime: number = 1000 * 60 * 5;
  public static readonly codeErrors: string[] = [
    'permission-denied',
    'unauthenticated',
    'invalid-argument',
    'not-found',
    'functions/permission-denied',
    'functions/unauthenticated',
    'functions/invalid-argument',
    'functions/not-found',
  ];

  public static companyCatalogQueryKey(slug: string, productId?: string): string[] {
    return productId
      ? [this.companyCatalogKey, slug, 'product', productId]
      : [this.companyCatalogKey, slug];
  }

  public static availabilityQueryKey(
    businessSlug: string,
    productId: string,
    date: string,
  ): string[] {
    return [this.availabilityKey, businessSlug, productId, date];
  }

  public static availabilitySearchQueryKey(
    businessSlug: string,
    productId: string,
    date: string,
  ): string[] {
    return [this.availabilitySearchKey, businessSlug, productId, date];
  }

  public static isNonRetryableFirebaseError(error: unknown): boolean {
    if (!error || typeof error !== 'object' || !('code' in error)) return false;

    const { code } = error;

    return typeof code === 'string' && this.codeErrors.includes(code);
  }
}
