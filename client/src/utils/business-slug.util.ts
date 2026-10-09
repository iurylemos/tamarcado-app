const businessSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidBusinessSlug(slug: string): boolean {
  return businessSlugPattern.test(slug);
}
