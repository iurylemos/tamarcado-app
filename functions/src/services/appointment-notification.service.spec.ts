import { Timestamp } from 'firebase-admin/firestore';
import { describe, expect, it } from 'vitest';
import type { AppointmentDocument } from '../model/appointment.model';
import { buildCollaboratorMessage, buildCustomerMessage } from './appointment-notification.service';

const appointment = {
  tenantId: 't1',
  customerName: 'Maria',
  customerPhoneE164: '+5511988887777',
  professionalId: 'p1',
  professionalNameSnapshot: 'Ana',
  productNameSnapshot: 'Design de cílios',
  startsAt: Timestamp.fromDate(new Date('2030-01-10T15:00:00Z')),
  whatsappOptIn: true,
} as unknown as AppointmentDocument;

describe('appointment WhatsApp messages', () => {
  it('builds the customer card with service, professional and local time', () => {
    const message = buildCustomerMessage('confirmed', appointment, 'Aurora', 'America/Sao_Paulo', {});
    expect(message.phoneE164).toBe('+5511988887777');
    expect(message.templateName).toBe('appointment_customer_update');
    const body = message.components.find((c) => c.type === 'body');
    expect(JSON.stringify(body)).toContain('Seu agendamento foi confirmado');
    expect(JSON.stringify(body)).toContain('10/01/2030');
  });

  it('builds the collaborator request with accept button and platform link', () => {
    const message = buildCollaboratorMessage('appt-1', appointment, 'America/Sao_Paulo', {});
    const buttons = message.components.filter((c) => c.type === 'button');
    expect(buttons[0]?.parameters).toEqual([{ type: 'payload', payload: 'accept:appt-1' }]);
    expect(buttons[1]).toMatchObject({ sub_type: 'url' });
  });
});
