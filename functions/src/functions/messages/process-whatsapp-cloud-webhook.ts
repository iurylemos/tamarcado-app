import { createHmac, timingSafeEqual } from 'node:crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import { canTransitionAppointment } from '../../../../shared/domain/appointment-status';
import { collections } from '../../config/collections';
import {
  acceptPayloadPrefix,
  loadAppointment,
  notifyCustomer,
} from '../../services/appointment-notification.service';
import { firestore } from '../../services/firestore.service';

export interface ButtonReply {
  from: string;
  payload: string;
  eventId: string;
}

export function isValidMetaSignature(
  rawBody: Buffer | string,
  header: unknown,
  appSecret: string | undefined,
): boolean {
  if (!appSecret || typeof header !== 'string' || !header.startsWith('sha256=')) return false;
  const expected = createHmac('sha256', appSecret).update(rawBody).digest();
  const provided = Buffer.from(header.slice(7), 'hex');
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export function verifyMetaChallenge(
  query: Record<string, unknown>,
  verifyToken: string | undefined,
): string | null {
  if (
    verifyToken &&
    query['hub.mode'] === 'subscribe' &&
    query['hub.verify_token'] === verifyToken &&
    typeof query['hub.challenge'] === 'string'
  ) {
    return query['hub.challenge'];
  }
  return null;
}

export function extractButtonReplies(payload: unknown): ButtonReply[] {
  const replies: ButtonReply[] = [];
  const entries = (payload as { entry?: unknown[] } | null)?.entry;
  if (!Array.isArray(entries)) return replies;
  for (const entry of entries) {
    const changes = (entry as { changes?: unknown[] })?.changes;
    for (const change of Array.isArray(changes) ? changes : []) {
      const messages = (change as { value?: { messages?: unknown[] } })?.value?.messages;
      for (const message of Array.isArray(messages) ? messages : []) {
        const item = message as {
          id?: string;
          from?: string;
          button?: { payload?: string };
          interactive?: { button_reply?: { id?: string } };
        };
        const reply = item.button?.payload ?? item.interactive?.button_reply?.id;
        if (typeof item.id === 'string' && typeof item.from === 'string' && typeof reply === 'string') {
          replies.push({ from: `+${item.from.replace(/^\+/, '')}`, payload: reply, eventId: item.id });
        }
      }
    }
  }
  return replies;
}

export type AcceptResult = 'confirmed' | 'ignored' | 'forbidden' | 'not-found' | 'duplicate';

// A collaborator accepts a booking from WhatsApp. The sender must be the assigned professional.
export async function acceptFromWhatsApp(reply: ButtonReply): Promise<AcceptResult> {
  if (!reply.payload.startsWith(acceptPayloadPrefix)) return 'ignored';
  const appointmentId = reply.payload.slice(acceptPayloadPrefix.length);
  const eventRef = firestore.collection(collections.providerWebhookEvents).doc(`wa-${reply.eventId}`);
  const appointmentRef = firestore.collection(collections.appointments).doc(appointmentId);

  const result = await firestore.runTransaction(async (transaction): Promise<AcceptResult> => {
    const [seen, snapshot] = await Promise.all([transaction.get(eventRef), transaction.get(appointmentRef)]);
    if (seen.exists) return 'duplicate';
    transaction.set(eventRef, { kind: 'button-reply', receivedAt: Timestamp.now() });
    const appointment = snapshot.data();
    if (!snapshot.exists || !appointment) return 'not-found';
    const professional = await transaction.get(
      firestore.collection(collections.professionals).doc(String(appointment.professionalId)),
    );
    const data = professional.data();
    if (!data || data.tenantId !== appointment.tenantId || data.phoneE164 !== reply.from) {
      return 'forbidden';
    }
    if (!canTransitionAppointment(appointment.status, 'confirmed')) return 'ignored';
    transaction.update(appointmentRef, {
      status: 'confirmed',
      updatedAt: Timestamp.now(),
      updatedBy: `whatsapp:${reply.from}`,
    });
    return 'confirmed';
  });

  if (result === 'confirmed') {
    const updated = await loadAppointment(appointmentId);
    if (updated) await notifyCustomer('confirmed', updated);
  }
  return result;
}

export async function processMetaWebhook(
  rawBody: Buffer | string,
  signature: unknown,
  appSecret: string | undefined = process.env.WHATSAPP_APP_SECRET,
): Promise<{ status: number; results?: AcceptResult[] }> {
  if (!isValidMetaSignature(rawBody, signature, appSecret)) return { status: 401 };
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody.toString());
  } catch {
    return { status: 400 };
  }
  const results: AcceptResult[] = [];
  for (const reply of extractButtonReplies(payload)) results.push(await acceptFromWhatsApp(reply));
  return { status: 200, results };
}

export const whatsappCloudWebhook = onRequest(async (request, response) => {
  if (request.method === 'GET') {
    const challenge = verifyMetaChallenge(request.query, process.env.WHATSAPP_VERIFY_TOKEN);
    if (challenge === null) response.status(403).end();
    else response.status(200).send(challenge);
    return;
  }
  if (request.method !== 'POST') {
    response.status(405).end();
    return;
  }
  const { status } = await processMetaWebhook(request.rawBody, request.get('x-hub-signature-256'));
  response.status(status).end();
});
