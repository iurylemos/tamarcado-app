import { logger } from 'firebase-functions';
import { performance } from 'node:perf_hooks';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { AppointmentDocument } from '../model/appointment.model';
import type { AppointmentNotificationJobDocument } from '../model/appointment-notification-job.model';
import { collections } from '../config/collections';
import { firestore } from './firestore.service';
import type {
  RichTemplateRequest,
  TemplateComponent,
  WhatsAppProvider,
} from './whatsapp-provider.interface';
import { WhatsAppProviderError } from './whatsapp-provider.interface';
import { whatsappProvider } from './whatsapp-provider.service';
import type {
  AppointmentParticipants,
  AppointmentCustomerEvent as CustomerEvent,
} from '../interfaces/appointment.interface';

export const acceptPayloadPrefix = 'accept:';

const customerHeadline: Record<CustomerEvent, string> = {
  requested: 'Recebemos sua solicita��o de agendamento',
  confirmed: 'Seu agendamento foi confirmado',
  cancelled: 'Seu agendamento foi cancelado',
  rescheduled: 'O hor�rio do seu agendamento foi alterado',
  completed: 'Seu atendimento foi conclu�do',
};

export function templateNames(env: NodeJS.ProcessEnv = process.env): AppointmentParticipants {
  return {
    customer: env.WHATSAPP_TEMPLATE_CUSTOMER || 'appointment_customer_update',
    collaborator: env.WHATSAPP_TEMPLATE_COLLABORATOR || 'appointment_collaborator_request',
  };
}

export function formatLocalDateTime(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: timezone,
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

const text = (value: string) => ({ type: 'text' as const, text: value.slice(0, 200) || '-' });

export function buildCustomerMessage(
  event: CustomerEvent,
  appointment: AppointmentDocument,
  businessName: string,
  timezone: string,
  env: NodeJS.ProcessEnv = process.env,
): RichTemplateRequest {
  const components: TemplateComponent[] = [];
  if (appointment.productImageUrlSnapshot) {
    components.push({
      type: 'header',
      parameters: [{ type: 'image', image: { link: appointment.productImageUrlSnapshot } }],
    });
  }

  components.push({
    type: 'body',
    parameters: [
      text(customerHeadline[event]),
      text(appointment.customerName || 'Cliente'),
      text(appointment.productNameSnapshot),
      text(appointment.professionalNameSnapshot),
      text(formatLocalDateTime(appointment.startsAt.toDate(), timezone)),
      text(businessName),
    ],
  });

  return {
    phoneE164: appointment.customerPhoneE164,
    templateName: templateNames(env).customer,
    components,
  };
}

export function buildCollaboratorMessage(
  appointmentId: string,
  appointment: AppointmentDocument,
  timezone: string,
  env: NodeJS.ProcessEnv = process.env,
): RichTemplateRequest {
  return {
    phoneE164: '',
    templateName: templateNames(env).collaborator,
    components: [
      {
        type: 'body',
        parameters: [
          text(appointment.customerName || 'Cliente'),
          text(appointment.productNameSnapshot),
          text(formatLocalDateTime(appointment.startsAt.toDate(), timezone)),
        ],
      },
      {
        type: 'button',
        sub_type: 'quick_reply',
        index: '0',
        parameters: [{ type: 'payload', payload: `${acceptPayloadPrefix}${appointmentId}` }],
      },
      // The template URL button is "<COLLABORATOR_APP_URL>/appointments/{{1}}".
      { type: 'button', sub_type: 'url', index: '1', parameters: [text(appointmentId)] },
    ],
  };
}

async function tenantContext(tenantId: string): Promise<{ name: string; timezone: string }> {
  const snapshot = await firestore.collection(collections.tenants).doc(tenantId).get();
  const tenant = snapshot.data();
  return {
    name: typeof tenant?.name === 'string' ? tenant.name : 'Estabelecimento',
    timezone: typeof tenant?.timezone === 'string' ? tenant.timezone : 'America/Sao_Paulo',
  };
}

// Notifications are best-effort: a WhatsApp failure must never undo or block an appointment change.
async function safely(label: string, task: () => Promise<unknown>): Promise<boolean> {
  try {
    await task();
    return true;
  } catch (error: unknown) {
    if (!(error instanceof WhatsAppProviderError)) throw error;
    logger.warn(`WhatsApp provider delivery failed: ${label}`, { code: error.code });
    return false;
  }
}

export async function notifyCustomer(
  event: CustomerEvent,
  appointment: AppointmentDocument,
  provider: WhatsAppProvider = whatsappProvider,
): Promise<boolean> {
  if (!appointment.whatsappOptIn) return true;
  return safely(`customer:${event}`, async () => {
    const { name, timezone } = await tenantContext(appointment.tenantId);
    await provider.sendTemplate(buildCustomerMessage(event, appointment, name, timezone));
  });
}

export async function notifyCollaboratorOfRequest(
  appointmentId: string,
  appointment: AppointmentDocument,
  provider: WhatsAppProvider = whatsappProvider,
): Promise<boolean> {
  return safely('collaborator:requested', async (): Promise<void> => {
    const existsProfessional = await firestore
      .collection(collections.professionals)
      .doc(appointment.professionalId)
      .get();

    if (!existsProfessional.exists) {
      return;
    }

    const professional = existsProfessional.data();

    if (
      !professional ||
      professional.tenantId !== appointment.tenantId ||
      !professional.phoneE164
    ) {
      return;
    }

    const { timezone } = await tenantContext(appointment.tenantId);
    const message = buildCollaboratorMessage(appointmentId, appointment, timezone);
    await provider.sendTemplate({ ...message, phoneE164: String(professional.phoneE164) });
  });
}

export async function notifyAppointmentRequested(
  appointmentId: string,
  appointment: AppointmentDocument,
  provider: WhatsAppProvider = whatsappProvider,
): Promise<boolean> {
  const results = await Promise.all([
    notifyCustomer('requested', appointment, provider),
    notifyCollaboratorOfRequest(appointmentId, appointment, provider),
  ]);
  return results.every(Boolean);
}

let notificationWorkerColdStart = true;

export async function processAppointmentNotification(
  jobId: string,
  provider: WhatsAppProvider = whatsappProvider,
): Promise<void> {
  const startedAt = performance.now();
  const coldStart = notificationWorkerColdStart;
  notificationWorkerColdStart = false;
  try {
    const jobRef = firestore.collection(collections.appointmentNotificationJobs).doc(jobId);
    const jobSnapshot = await jobRef.get();
    const job = jobSnapshot.data() as AppointmentNotificationJobDocument | undefined;

    if (!jobSnapshot.exists || !job) {
      throw new Error('Appointment notification job was not found.');
    }
    if (job.status !== 'pending') return;

    const appointment = await loadAppointment(job.appointmentId);
    if (!appointment) throw new Error('Appointment for notification job was not found.');

    const delivered = await notifyAppointmentRequested(job.appointmentId, appointment, provider);
    await jobRef.update({
      status: delivered ? 'completed' : 'failed',
      ...(delivered
        ? { failureCode: FieldValue.delete() }
        : { failureCode: 'provider_delivery_failed' }),
      updatedAt: Timestamp.now(),
    });
  } finally {
    logger.info('booking.performance', {
      operation: 'notification_processing',
      stage: 'worker_total',
      durationMs: Math.round(performance.now() - startedAt),
      coldStart,
    });
  }
}

export async function loadAppointment(
  appointmentId: string,
): Promise<AppointmentDocument | undefined> {
  const snapshot = await firestore.collection(collections.appointments).doc(appointmentId).get();
  return snapshot.data() as AppointmentDocument | undefined;
}
