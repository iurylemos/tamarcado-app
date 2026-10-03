import { httpsCallable } from 'firebase/functions';
import type {
  BackofficeWorkspace,
  ProductRecord,
  WorkingHoursRecord,
} from '../interfaces/admin.interface';
import { auth, functions } from '../config/firebase.config';

async function callable<TInput, TOutput>(name: string, data?: TInput): Promise<TOutput> {
  const currentUser = auth.currentUser;

  if (!currentUser) throw new Error('Entre na sua conta para continuar.');

  await currentUser.getIdToken(true);

  const call = httpsCallable<TInput, TOutput>(functions, name);

  const result = data === undefined ? await call() : await call(data);

  return result.data;
}

export function getWorkspace(): Promise<BackofficeWorkspace> {
  return callable<void, BackofficeWorkspace>('getBackofficeWorkspace');
}

export function saveProduct(product: Omit<ProductRecord, 'tenantId'>): Promise<{ id: string }> {
  return callable('saveProduct', product);
}

export function saveProfessional(input: {
  id?: string;
  name: string;
  phone: string;
  photoUrl: string;
  active: boolean;
  productIds: string[];
}): Promise<{ id: string }> {
  return callable('saveProfessional', input);
}

export function saveWorkingHours(
  input: Omit<WorkingHoursRecord, 'tenantId' | 'id'> & { id?: string },
): Promise<{ id: string }> {
  return callable('saveWorkingHours', input);
}

export function saveBlockedPeriod(input: {
  id?: string;
  professionalId?: string;
  reason: string;
  startsAt: string;
  endsAt: string;
}): Promise<{ id: string }> {
  return callable('saveBlockedPeriod', input);
}

export function deleteBlockedPeriod(id: string): Promise<{ deleted: boolean }> {
  return callable('deleteBlockedPeriod', { id });
}

export function saveCompany(input: {
  name: string;
  slug: string;
  segment: string;
  description: string;
  phone: string;
  logoUrl: string;
  timezone: string;
  bookingIntervalMinutes: number;
  active: boolean;
}): Promise<{ saved: boolean }> {
  return callable('saveTenantSettings', input);
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Não foi possível concluir a operação. Tente novamente.';
}
