import { onCall } from 'firebase-functions/v2/https';
import { authorizeActor } from '../../services/authorization.service';
import {
  deleteProductGallery,
  saveProductGallery,
} from '../../services/backoffice.service';
import { callableOptionsBackoffice } from '../../options/callable.option';

export const saveProductGalleryCallable = onCall(callableOptionsBackoffice, async (request) => {
  const actor = await authorizeActor(request, ['backoffice']);
  return saveProductGallery(actor.tenantId, request.data);
});

export const deleteProductGalleryCallable = onCall(callableOptionsBackoffice, async (request) => {
  const actor = await authorizeActor(request, ['backoffice']);
  return deleteProductGallery(actor.tenantId, request.data);
});
