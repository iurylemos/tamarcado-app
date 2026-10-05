import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  extractButtonReplies,
  isValidMetaSignature,
  verifyMetaChallenge,
} from './process-whatsapp-cloud-webhook';

describe('WhatsApp Cloud webhook', () => {
  it('answers the verification challenge only with the right token', () => {
    const query = { 'hub.mode': 'subscribe', 'hub.verify_token': 'tk', 'hub.challenge': '42' };
    expect(verifyMetaChallenge(query, 'tk')).toBe('42');
    expect(verifyMetaChallenge(query, 'other')).toBeNull();
    expect(verifyMetaChallenge(query, undefined)).toBeNull();
  });

  it('validates X-Hub-Signature-256', () => {
    const body = '{"a":1}';
    const sig = `sha256=${createHmac('sha256', 's').update(body).digest('hex')}`;
    expect(isValidMetaSignature(body, sig, 's')).toBe(true);
    expect(isValidMetaSignature(body, sig, 'x')).toBe(false);
    expect(isValidMetaSignature(body, 'bad', 's')).toBe(false);
  });

  it('extracts quick-reply button payloads', () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  { id: 'wamid.9', from: '5511999990001', button: { payload: 'accept:a1' } },
                  { id: 'wamid.10', from: '5511999990001', text: { body: 'oi' } },
                ],
              },
            },
          ],
        },
      ],
    };
    expect(extractButtonReplies(payload)).toEqual([
      { eventId: 'wamid.9', from: '+5511999990001', payload: 'accept:a1' },
    ]);
  });
});
