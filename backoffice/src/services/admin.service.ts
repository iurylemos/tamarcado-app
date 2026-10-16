import { httpsCallable } from 'firebase/functions';
import type { BackofficeWorkspace, InputWorkingHours } from '../interfaces/admin.interface';
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
import type {
  ProductCustomizationSelection,
  ProductImage,
} from '@shared/interfaces/product.interface';
import type { ProductRecord } from '../interfaces/product.interface';

async function callable<TInput, TOutput>(name: string, data?: TInput): Promise<TOutput> {
  const currentUser = auth.currentUser;

  if (!currentUser) throw new Error('Entre na sua conta para continuar.');

  await currentUser.getIdToken(true);

  const call = httpsCallable<TInput, TOutput>(functions, name);

  const result = data === undefined ? await call() : await call(data);

  return result.data;
}

export async function getWorkspace(): Promise<BackofficeWorkspace> {
  return await callable<void, BackofficeWorkspace>('getBackofficeWorkspace');
}

export async function saveProduct(
  product: Omit<ProductRecord, 'tenantId'>,
): Promise<Pick<GenericAdmin, 'id'>> {
  return await callable('saveProduct', product);
}

export async function saveProductGallery(input: {
  productId: string;
  galleryId?: string;
  selections: ProductCustomizationSelection[];
  images: ProductImage[];
}): Promise<{ id: string }> {
  return await callable('saveProductGallery', input);
}

export async function deleteProductGallery(input: {
  productId: string;
  galleryId: string;
}): Promise<{ storagePaths: string[] }> {
  return await callable('deleteProductGallery', input);
}

export async function saveProfessional(
  input: InputProfessional,
): Promise<Pick<GenericAdmin, 'id'>> {
  return await callable('saveProfessional', input);
}

export async function saveCollaboratorAccount(
  input: InputCollaboratorAccount,
): Promise<CollaboratorAccountData> {
  return await callable('saveCollaboratorAccount', input);
}

export async function resetCollaboratorPassword(
  input: InputResetCollaborator,
): Promise<Pick<CollaboratorAccountData, 'uid'>> {
  return await callable('resetCollaboratorPassword', input);
}

export async function saveWorkingHours(
  input: InputWorkingHours,
): Promise<Pick<GenericAdmin, 'id'>> {
  return await callable('saveWorkingHours', input);
}

export async function saveBlockedPeriod(input: InputBlockedPeriod): Promise<{ id: string }> {
  return await callable('saveBlockedPeriod', input);
}

export async function deleteBlockedPeriod(id: string): Promise<Pick<GenericAdmin, 'deleted'>> {
  return await callable('deleteBlockedPeriod', { id });
}

export async function saveCompany(input: InputCompany): Promise<Pick<GenericAdmin, 'saved'>> {
  return await callable('saveTenantSettings', input);
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Não foi possível concluir a operação. Tente novamente.';
}
