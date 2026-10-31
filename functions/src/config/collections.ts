export const collections = {
  tenants: 'tenants',
  users: 'users',
  products: 'products',
  professionals: 'professionals',
  professionalProducts: 'professional_products',
  workingHours: 'working_hours',
  blockedPeriods: 'blocked_periods',
  appointments: 'appointments',
  bookingReservations: 'booking_reservations',
  monthlyReports: 'monthly_reports',
  connections: 'connections',
  contacts: 'contacts',
  messages: 'messages',
  publicBusinesses: 'public_businesses',
  publicProducts: 'public_products',
  productImageGalleries: 'product_image_galleries',
  publicProductGalleries: 'public_product_galleries',
  providerOutbox: 'provider_outbox',
  aiAnalysisExecutions: 'ai_analysis_executions',
  aiAnalysisProposals: 'ai_analysis_proposals',
} as const;

export type CollectionName = (typeof collections)[keyof typeof collections];
