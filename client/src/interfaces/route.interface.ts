export type AppRoute =
  | { name: 'home' }
  | { name: 'catalog'; slug: string }
  | { name: 'booking'; slug: string; productId: string }
  | { name: 'not-found' };
