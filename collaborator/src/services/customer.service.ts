import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase.config';
import type { CollaboratorCustomer } from '../interfaces/appointment.interface';

interface CustomerListResponse {
  customers: CollaboratorCustomer[];
  timezone: string;
}

export async function listCustomers(): Promise<CustomerListResponse> {
  const callable = httpsCallable<void, CustomerListResponse>(functions, 'listCustomers');
  const { data } = await callable();
  return data;
}
