import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase.config';
import type { CustomerListResponse } from '../interfaces/customer.interface';

export async function listCustomers(): Promise<CustomerListResponse> {
  const callable = httpsCallable<void, CustomerListResponse>(functions, 'listCustomers');
  const { data } = await callable();
  return data;
}
