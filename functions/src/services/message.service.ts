import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { collections } from '../config/collections';
import type { AppointmentDocument } from '../model/appointment.model';
import type { MessageStatus } from '../../../shared/domain/interfaces/message.interface';
import type { AuthorizedActor } from './authorization.service';
import { firestore } from './firestore.service';
import { isApprovedTemplate, WhatsAppProviderError } from './whatsapp-provider.interface';
import type { WhatsAppProvider } from './whatsapp-provider.interface';
import { whatsappProvider } from './whatsapp-provider.service';

const statusRank: Record<MessageStatus, number> = {
  pending: 0,
  sent: 1,
  delivered: 2,
  read: 3,
  failed: 4,
};

// Appointment status is never read for writing or modified here; failures only affect the message.
export async function sendAppointmentMessage(
  actor: AuthorizedActor,
  input: { appointmentId: string; templateCategory: unknown; content: string },
  provider: WhatsAppProvider = whatsappProvider,
): Promise<{ messageId: string; status: MessageStatus }> {
  if (!isApprovedTemplate(input.templateCategory)) {
    throw new HttpsError('invalid-argument', 'Use um modelo de mensagem aprovado.');
  }
  const content = input.content.trim();
  if (!content) throw new HttpsError('invalid-argument', 'Informe o conteÃºdo da mensagem.');

  const appointmentSnapshot = await firestore
    .collection(collections.appointments)
    .doc(input.appointmentId)
    .get();
  const appointment = appointmentSnapshot.data() as AppointmentDocument | undefined;
  if (
    !appointment ||
    appointment.tenantId !== actor.tenantId ||
    (actor.professionalId && appointment.professionalId !== actor.professionalId)
  ) {
    throw new HttpsError('not-found', 'Agendamento nÃ£o encontrado.');
  }

  const contacts = await firestore
    .collection(collections.contacts)
    .where('tenantId', '==', actor.tenantId)
    .where('phoneE164', '==', appointment.customerPhoneE164)
    .get();
  const contact = contacts.docs.find((document) => document.data().whatsappOptIn === true);
  if (!contact) {
    throw new HttpsError(
      'failed-precondition',
      'O cliente nÃ£o autorizou mensagens por WhatsApp para esta empresa.',
    );
  }

  const messageReference = firestore.collection(collections.messages).doc();
  await messageReference.set({
    tenantId: actor.tenantId,
    connectionId: contact.data().connectionId,
    contactId: contact.id,
    appointmentId: input.appointmentId,
    direction: 'outbound',
    content,
    templateCategory: input.templateCategory,
    status: 'pending',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  try {
    const { providerMessageId } = await provider.sendTemplateMessage({
      phoneE164: appointment.customerPhoneE164,
      templateCategory: input.templateCategory,
      content,
    });
    await messageReference.update({
      status: 'sent',
      providerMessageId,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { messageId: messageReference.id, status: 'sent' };
  } catch (error) {
    const failureCode = error instanceof WhatsAppProviderError ? error.code : 'PROVIDER_ERROR';
    await messageReference.update({
      status: 'failed',
      failureCode,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { messageId: messageReference.id, status: 'failed' };
  }
}

export type WebhookResult = 'applied' | 'duplicate' | 'ignored' | 'unknown-message';

export async function applyProviderStatusEvent(event: {
  eventId: string;
  providerMessageId: string;
  status: MessageStatus;
  failureCode?: string;
}): Promise<WebhookResult> {
  const eventReference = firestore.collection(collections.providerWebhookEvents).doc(event.eventId);
  const matches = await firestore
    .collection(collections.messages)
    .where('providerMessageId', '==', event.providerMessageId)
    .limit(1)
    .get();
  const messageSnapshot = matches.docs[0];

  return firestore.runTransaction(async (transaction) => {
    const seen = await transaction.get(eventReference);
    const current = messageSnapshot ? await transaction.get(messageSnapshot.ref) : undefined;
    if (seen.exists) return 'duplicate';
    transaction.set(eventReference, {
      providerMessageId: event.providerMessageId,
      status: event.status,
      receivedAt: FieldValue.serverTimestamp(),
    });
    if (!messageSnapshot) return 'unknown-message';

    const currentStatus = current?.data()?.status as MessageStatus | undefined;
    if (!currentStatus || statusRank[event.status] <= statusRank[currentStatus]) return 'ignored';
    if (currentStatus === 'failed') return 'ignored';

    transaction.update(messageSnapshot.ref, {
      status: event.status,
      ...(event.status === 'failed' ? { failureCode: event.failureCode ?? 'PROVIDER_ERROR' } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return 'applied';
  });
}