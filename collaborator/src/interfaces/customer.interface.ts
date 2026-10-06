import type { CollaboratorCustomer } from './appointment.interface';

export interface CustomerListResponse {
  customers: CollaboratorCustomer[];
  timezone: string;
}

export type CustomerHistoryData = {
  latestAppointment: string;
  attendance: string;
  whatsappUrl: string;
};
