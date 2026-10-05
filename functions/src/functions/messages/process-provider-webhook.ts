import { createHmac, timingSafeEqual } from 'node:crypto';
import { onRequest } from 'firebase-functions/v2/https';
import type { MessageStatus } from '../../../../shared/domain/interfaces/message.interface';
import type { WebhookMessageResult } from '../../interfaces/message.interface';
import { applyProviderStatusEvent } from '../../services/message.service';

const statuses: readonly MessageStatus[] = ['pending', 'sent', 'delivered', 'read', 'failed'];

export function isValidSignature(
  rawBody: Buffer | string,
  signature: unknown,
  secret: string | undefined,
): boolean {
  if (!secret || typeof signature !== 'string') return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest();
  const provided = Buffer.from(signature, 'hex');
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export async function processProviderWebhook(
  rawBody: Buffer | string,
  signature: unknown,
  secret: string | undefined = process.env.WHATSAPP_WEBHOOK_SECRET,
): Promise<{ status: number; result?: WebhookMessageResult }> {
  if (!isValidSignature(rawBody, signature, secret)) return { status: 401 };
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody.toString());
  } catch {
    return { status: 400 };
  }
  const event = (typeof payload === 'object' && payload !== null ? payload : {}) as Record<
    string,
    unknown
  >;
  const status = statuses.find((item) => item === event.status);
  if (typeof event.eventId !== 'string' || typeof event.providerMessageId !== 'string' || !status) {
    return { status: 400 };
  }
  const result = await applyProviderStatusEvent({
    eventId: event.eventId,
    providerMessageId: event.providerMessageId,
    status,
    ...(typeof event.failureCode === 'string' ? { failureCode: event.failureCode } : {}),
  });
  return { status: 200, result };
}

export const providerWebhook = onRequest(async (request, response) => {
  if (request.method !== 'POST') {
    response.status(405).end();
    return;
  }
  const { status, result } = await processProviderWebhook(
    request.rawBody,
    request.get('x-signature'),
  );
  response.status(status).json(result ? { result } : {});
});
