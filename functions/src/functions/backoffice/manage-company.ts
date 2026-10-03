import { onCall } from 'firebase-functions/v2/https';
import { authorizeActor } from '../../services/authorization.service';
import {
  deleteBlockedPeriod,
  getBackofficeWorkspace,
  saveBlockedPeriod,
  saveProduct,
  saveProfessional,
  saveTenantSettings,
  saveWorkingHours,
} from '../../services/backoffice.service';

export const getBackofficeWorkspaceCallable = onCall(async (request) => {
  const actor = await authorizeActor(request, ['backoffice']);
  return getBackofficeWorkspace(actor.tenantId);
});

export const saveProductCallable = onCall(async (request) => {
  const actor = await authorizeActor(request, ['backoffice']);
  return saveProduct(actor.tenantId, request.data);
});

export const saveProfessionalCallable = onCall(async (request) => {
  const actor = await authorizeActor(request, ['backoffice']);
  return saveProfessional(actor.tenantId, request.data);
});

export const saveWorkingHoursCallable = onCall(async (request) => {
  const actor = await authorizeActor(request, ['backoffice']);
  return saveWorkingHours(actor.tenantId, request.data);
});

export const saveBlockedPeriodCallable = onCall(async (request) => {
  const actor = await authorizeActor(request, ['backoffice']);
  return saveBlockedPeriod(actor.tenantId, actor.uid, request.data);
});

export const deleteBlockedPeriodCallable = onCall(async (request) => {
  const actor = await authorizeActor(request, ['backoffice']);
  await deleteBlockedPeriod(actor.tenantId, request.data?.id);
  return { deleted: true };
});

export const saveTenantSettingsCallable = onCall(async (request) => {
  const actor = await authorizeActor(request, ['backoffice']);
  await saveTenantSettings(actor.tenantId, request.data);
  return { saved: true };
});
