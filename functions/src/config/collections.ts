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
  phoneVerificationChallenges: 'phone_verification_challenges',
  phoneVerificationRateLimits: 'phone_verification_rate_limits',
} as const;

export type CollectionName = (typeof collections)[keyof typeof collections];
