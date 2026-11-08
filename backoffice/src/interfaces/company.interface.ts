export type InputCompany = {
  name: string;
  slug: string;
  segment: string;
  description: string;
  phone: string;
  logoUrl: string;
  primaryColor?: string;
  secondaryColor?: string;
  emailDomain: string;
  timezone: string;
  bookingIntervalMinutes: number;
  active: boolean;
};
