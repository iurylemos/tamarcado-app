import { onCall } from 'firebase-functions/v2/https';
import { normalizeBrazilianPhone } from '../../../../shared/domain/phone';
import {
  resetCollaboratorPassword,
  saveCollaboratorAccount,
  syncCollaboratorAccount,
} from '../../services/collaborator-account.service';
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
  const saved = await saveProfessional(actor.tenantId, request.data);
  const data = request.data as { name: string; phone: string; active: boolean };
  const phoneE164 = normalizeBrazilianPhone(data.phone) ?? '';
  await syncCollaboratorAccount(actor.tenantId, saved.id, { name: data.name.trim(), phoneE164, active: data.active });
  return saved;
});

export const saveCollaboratorAccountCallable = onCall(async (request) => {
  const actor = await authorizeActor(request, ['backoffice']);
  return saveCollaboratorAccount(actor.tenantId, request.data);
});

export const resetCollaboratorPasswordCallable = onCall(async (request) => {
  const actor = await authorizeActor(request, ['backoffice']);
  return resetCollaboratorPassword(actor.tenantId, request.data);
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

