import { Timestamp } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { getZonedDateTimeParts } from '../../../shared/domain/timezone';
import {
  buildSalesCsv,
  getReportingPeriod,
  summarizeSales,
  type SalesAppointment,
  type SalesReport,
} from '../../../shared/domain/reporting';
import { collections } from '../config/collections';
import type { AppointmentDocument } from '../model/appointment.model';
import type { TenantDocument } from '../model/tenant.model';
import type { AuthorizedActor } from './authorization.service';
import { firestore } from './firestore.service';

export interface ReportRequest {
  year?: number;
  month?: number;
  productId?: string;
  professionalId?: string;
}

interface ReportContext {
  report: SalesReport;
  period: ReturnType<typeof getReportingPeriod>;
}

function inputObject(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new HttpsError('invalid-argument', 'Informe os filtros do relatório.');
  }
  return value as Record<string, unknown>;
}

function optionalPeriodValue(value: unknown, label: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new HttpsError('invalid-argument', `${label} inválido.`);
  }
  return value;
}

function optionalDocumentId(value: unknown, label: string): string | undefined {
  if (value === undefined || value === '') return undefined;
  if (typeof value !== 'string' || !value.trim() || value.length > 150 || value.includes('/')) {
    throw new HttpsError('invalid-argument', `${label} inválido.`);
  }
  return value.trim();
}

export function parseReportRequest(value: unknown): ReportRequest {
  const input = inputObject(value);
  const year = optionalPeriodValue(input.year, 'Ano');
  const month = optionalPeriodValue(input.month, 'Mês');
  const productId = optionalDocumentId(input.productId, 'Serviço');
  const professionalId = optionalDocumentId(input.professionalId, 'Colaborador');
  if ((year === undefined) !== (month === undefined)) {
    throw new HttpsError('invalid-argument', 'Informe o ano e o mês do relatório.');
  }
  return {
    ...(year !== undefined ? { year } : {}),
    ...(month !== undefined ? { month } : {}),
    ...(productId ? { productId } : {}),
    ...(professionalId ? { professionalId } : {}),
  };
}

async function resolvePeriod(
  tenantId: string,
  request: ReportRequest,
): Promise<ReturnType<typeof getReportingPeriod>> {
  const tenantSnapshot = await firestore.collection(collections.tenants).doc(tenantId).get();
  const tenant = tenantSnapshot.data() as TenantDocument | undefined;
  if (!tenant?.timezone) {
    throw new HttpsError('failed-precondition', 'O fuso horário da empresa não está configurado.');
  }

  let currentParts: ReturnType<typeof getZonedDateTimeParts> | undefined;
  if (request.year === undefined) {
    try {
      currentParts = getZonedDateTimeParts(new Date(), tenant.timezone);
    } catch (error: unknown) {
      if (error instanceof RangeError) {
        throw new HttpsError(
          'failed-precondition',
          'O fuso horário da empresa não está configurado corretamente.',
        );
      }
      throw error;
    }
  }
  const year = request.year ?? currentParts?.year;
  const month = request.month ?? currentParts?.month;
  if (year === undefined || month === undefined) {
    throw new HttpsError('invalid-argument', 'Informe um período válido para o relatório.');
  }
  try {
    return getReportingPeriod(year, month, tenant.timezone);
  } catch (error: unknown) {
    if (error instanceof RangeError) {
      throw new HttpsError(
        'invalid-argument',
        'O período ou fuso horário do relatório é inválido.',
      );
    }
    throw error;
  }
}

async function loadReportContext(
  tenantId: string,
  request: ReportRequest,
  professionalId?: string,
): Promise<ReportContext> {
  const period = await resolvePeriod(tenantId, request);
  let query = firestore
    .collection(collections.appointments)
    .where('tenantId', '==', tenantId)
    .where('startsAt', '>=', Timestamp.fromDate(period.startsAt))
    .where('startsAt', '<', Timestamp.fromDate(period.endsAt));
  if (professionalId) query = query.where('professionalId', '==', professionalId);

  const snapshot = await query.get();
  const appointments = snapshot.docs.map((document) => {
    const appointment = document.data() as AppointmentDocument;
    return {
      id: document.id,
      tenantId: appointment.tenantId,
      status: appointment.status,
      startsAt: appointment.startsAt.toDate(),
      productId: appointment.productId,
      productNameSnapshot: appointment.productNameSnapshot,
      productPriceCentsSnapshot: appointment.productPriceCentsSnapshot,
      commissionTypeSnapshot: appointment.commissionTypeSnapshot,
      commissionValueSnapshot: appointment.commissionValueSnapshot,
      professionalId: appointment.professionalId,
      professionalNameSnapshot: appointment.professionalNameSnapshot,
    } satisfies SalesAppointment;
  });

  return {
    period,
    report: summarizeSales(appointments, {
      tenantId,
      period,
      ...(request.productId ? { productId: request.productId } : {}),
      ...(request.professionalId ? { professionalId: request.professionalId } : {}),
    }),
  };
}

export async function calculateCollaboratorReport(
  actor: AuthorizedActor,
  rawRequest: unknown,
): Promise<SalesReport> {
  if (!actor.professionalId) {
    throw new HttpsError('permission-denied', 'Esta conta não está vinculada a um colaborador.');
  }
  const request = parseReportRequest(rawRequest === undefined ? {} : rawRequest);
  if (request.professionalId && request.professionalId !== actor.professionalId) {
    throw new HttpsError(
      'permission-denied',
      'Você não tem acesso ao relatório deste colaborador.',
    );
  }
  return (await loadReportContext(actor.tenantId, request, actor.professionalId)).report;
}

export async function calculateSalesReport(
  tenantId: string,
  rawRequest: unknown,
): Promise<SalesReport> {
  const request = parseReportRequest(rawRequest === undefined ? {} : rawRequest);
  return (await loadReportContext(tenantId, request)).report;
}

export async function exportSalesReport(
  tenantId: string,
  rawRequest: unknown,
): Promise<{ csv: string; filename: string }> {
  const request = parseReportRequest(rawRequest === undefined ? {} : rawRequest);
  const { report, period } = await loadReportContext(tenantId, request);
  return {
    csv: buildSalesCsv(report.rows, period.timezone),
    filename: `vendas-${period.year}-${String(period.month).padStart(2, '0')}.csv`,
  };
}
