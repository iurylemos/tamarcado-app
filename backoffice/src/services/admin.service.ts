import { httpsCallable } from 'firebase/functions';
import type {
  BackofficeWorkspace,
  ProductRecord,
  InputWorkingHours,
} from '../interfaces/admin.interface';
import { auth, functions } from '../config/firebase.config';
import type { InputProfessional } from '../interfaces/professional.interface';
import type {
  CollaboratorAccountData,
  GenericAdmin,
  InputCollaboratorAccount,
  InputResetCollaborator,
} from '../interfaces/collaborator.interface';
import type { InputBlockedPeriod } from '../interfaces/period.interface';
import type { InputCompany } from '../interfaces/company.interface';

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

export function saveProduct(
  product: Omit<ProductRecord, 'tenantId'>,
): Promise<Pick<GenericAdmin, 'id'>> {
  return callable('saveProduct', product);
}

export function saveProfessional(input: InputProfessional): Promise<Pick<GenericAdmin, 'id'>> {
  return callable('saveProfessional', input);
}

export function saveCollaboratorAccount(
  input: InputCollaboratorAccount,
): Promise<CollaboratorAccountData> {
  return callable('saveCollaboratorAccount', input);
}

export function resetCollaboratorPassword(
  input: InputResetCollaborator,
): Promise<Pick<CollaboratorAccountData, 'uid'>> {
  return callable('resetCollaboratorPassword', input);
}

export function saveWorkingHours(input: InputWorkingHours): Promise<Pick<GenericAdmin, 'id'>> {
  return callable('saveWorkingHours', input);
}

export function saveBlockedPeriod(input: InputBlockedPeriod): Promise<{ id: string }> {
  return callable('saveBlockedPeriod', input);
}

export function deleteBlockedPeriod(id: string): Promise<Pick<GenericAdmin, 'deleted'>> {
  return callable('deleteBlockedPeriod', { id });
}

export function saveCompany(input: InputCompany): Promise<Pick<GenericAdmin, 'saved'>> {
  return callable('saveTenantSettings', input);
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Não foi possível concluir a operação. Tente novamente.';
}
