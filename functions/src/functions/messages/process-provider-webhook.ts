import twilio from 'twilio';
import { onRequest } from 'firebase-functions/v2/https';
import type { MessageStatus } from '../../../../shared/domain/interfaces/message.interface';
import type { WebhookMessageResult } from '../../interfaces/message.interface';
import { applyProviderStatusEvent } from '../../services/message.service';

const twilioStatuses: Record<string, MessageStatus> = {
  accepted: 'sent',
  queued: 'sent',
  sending: 'sent',
  sent: 'sent',
  delivered: 'delivered',
  read: 'read',
  failed: 'failed',
  undelivered: 'failed',
  canceled: 'failed',
};

export function isValidSignature(
  rawBody: Buffer | string,
  signature: unknown,
  callbackUrl: string,
  authToken: string | undefined,
): boolean {
  if (!authToken || typeof signature !== 'string') return false;
  const params = Object.fromEntries(new URLSearchParams(rawBody.toString()));
  return twilio.validateRequest(authToken, signature, callbackUrl, params);
}

export async function processProviderWebhook(
  rawBody: Buffer | string,
  signature: unknown,
  callbackUrl: string,
  authToken: string | undefined = process.env.TWILIO_AUTH_TOKEN,
): Promise<{ status: number; result?: WebhookMessageResult }> {
  if (!isValidSignature(rawBody, signature, callbackUrl, authToken)) return { status: 401 };

  const params = new URLSearchParams(rawBody.toString());
  const providerMessageId = params.get('MessageSid');
  const providerStatus = params.get('MessageStatus');
  const status = providerStatus ? twilioStatuses[providerStatus] : undefined;
  if (!providerMessageId || !providerStatus || !status) return { status: 400 };

  const errorCode = params.get('ErrorCode');
  const result = await applyProviderStatusEvent({
    eventId: `${providerMessageId}:${providerStatus}:${errorCode ?? ''}`,
    providerMessageId,
    status,
    ...(errorCode ? { failureCode: `TWILIO_${errorCode}` } : {}),
  });
  return { status: 200, result };
}

export const providerWebhook = onRequest(async (request, response) => {
  if (request.method !== 'POST') {
    response.status(405).end();
    return;
  }

  const host = request.get('host');
  if (!host) {
    response.status(400).end();
    return;
  }
  const forwardedProtocol = request.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const protocol = forwardedProtocol || request.protocol;
  const callbackUrl = `${protocol}://${host}${request.originalUrl}`;
  const { status, result } = await processProviderWebhook(
    request.rawBody,
    request.get('x-twilio-signature'),
    callbackUrl,
  );
  response.status(status).json(result ? { result } : {});
});
