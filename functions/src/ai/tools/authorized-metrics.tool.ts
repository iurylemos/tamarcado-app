import { Timestamp } from 'firebase-admin/firestore';
import { summarizeSales, type SalesAppointment } from '../../../../shared/domain/reporting';
import { localDateTimeToUtc } from '../../../../shared/domain/timezone';
import { collections } from '../../config/collections';
import {
  analysisSchemaVersion,
  type AggregatedMetrics,
  type AnalysisExecutionDocument,
  type AnalysisRequestSnapshot,
} from '../../model/ai-analysis.model';
import type { AppointmentDocument } from '../../model/appointment.model';
import type { MetricsAppointment } from '../interfaces/metrics.interface';
import { aggregatedMetricsSchema } from '../schemas/metrics.schema';
import {
  MetricsUtil,
  MetricsUtilLimitExceededError,
  MetricsUtilUnavailableError,
} from '../utils/metrics.util';
import { firestore } from '../../services/firestore.service';

const noDataLimitation = 'Não há agendamentos no período selecionado.';

export function periodBounds(request: AnalysisRequestSnapshot): { startsAt: Date; endsAt: Date } {
  try {
    return {
      startsAt: localDateTimeToUtc(request.period.start, '00:00', request.timezone),
      endsAt: localDateTimeToUtc(request.period.endExclusive, '00:00', request.timezone),
    };
  } catch (error: unknown) {
    if (error instanceof RangeError) throw new MetricsUtilUnavailableError();

    throw error;
  }
}

// Pure aggregation: only counts and sums leave this function, never individual rows.
export function buildAggregatedMetrics(
  appointments: readonly MetricsAppointment[],
  tenantId: string,
  request: AnalysisRequestSnapshot,
): AggregatedMetrics {
  const { startsAt, endsAt } = periodBounds(request);

  const inScope = appointments.filter(
    (appointment) =>
      appointment.tenantId === tenantId &&
      appointment.startsAt >= startsAt &&
      appointment.startsAt < endsAt,
  );

  const statusCounts = { pending: 0, confirmed: 0, cancelled: 0, completed: 0 };

  for (const appointment of inScope) statusCounts[appointment.status] += 1;

  const period = { ...request.period, timezone: request.timezone };

  const unavailableNoData = { available: false, limitation: noDataLimitation } as const;

  const base = {
    schemaVersion: analysisSchemaVersion,
    period,
    appointmentCount: inScope.length,
    statusCounts,
    occupancy: {
      available: false,
      limitation: 'A cobertura de capacidade e agenda ainda não é comprovada.',
    },
    periodComparison: {
      available: false,
      limitation: 'A comparação entre períodos ainda não está disponível.',
    },
  } as const;

  if (!inScope.length) {
    return aggregatedMetricsSchema.parse({
      ...base,
      coverage: 'no_data',
      completedSalesCents: unavailableNoData,
      completedCommissionCents: unavailableNoData,
    });
  }

  const sales = summarizeSales(
    inScope.map((appointment): SalesAppointment => ({ ...appointment })),
    {
      tenantId,
      period: { year: 0, month: 0, timezone: request.timezone, startsAt, endsAt },
    },
  );

  return aggregatedMetricsSchema.parse({
    ...base,
    coverage: 'sufficient',
    completedSalesCents: { available: true, value: sales.totalSalesCents },
    completedCommissionCents: { available: true, value: sales.totalCommissionCents },
  });
}

export async function getAggregatedMetrics(executionId: string): Promise<AggregatedMetrics> {
  const snapshot = await firestore
    .collection(collections.aiAnalysisExecutions)
    .doc(executionId)
    .get();

  const execution = snapshot.data() as AnalysisExecutionDocument | undefined;

  if (!execution?.tenantId || !execution.request) throw new MetricsUtilUnavailableError();

  // Tenant and period come only from the persisted execution, never from agent or client input.
  const { startsAt, endsAt } = periodBounds(execution.request);

  const result = await firestore
    .collection(collections.appointments)
    .where('tenantId', '==', execution.tenantId)
    .where('startsAt', '>=', Timestamp.fromDate(startsAt))
    .where('startsAt', '<', Timestamp.fromDate(endsAt))
    .limit(MetricsUtil.maxMetricsAppointments + 1)
    .get();

  if (result.size > MetricsUtil.maxMetricsAppointments) throw new MetricsUtilLimitExceededError();

  const appointments = result.docs.map((document): MetricsAppointment => {
    const data = document.data() as AppointmentDocument;

    return {
      tenantId: data.tenantId,
      status: data.status,
      startsAt: data.startsAt.toDate(),
      productId: data.productId,
      productNameSnapshot: data.productNameSnapshot,
      productPriceCentsSnapshot: data.productPriceCentsSnapshot,
      commissionTypeSnapshot: data.commissionTypeSnapshot,
      commissionValueSnapshot: data.commissionValueSnapshot,
      professionalId: data.professionalId,
      professionalNameSnapshot: data.professionalNameSnapshot,
    };
  });

  return buildAggregatedMetrics(appointments, execution.tenantId, execution.request);
}
