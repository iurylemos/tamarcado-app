import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { collections } from '../config/collections';
import type { MonthlyReportDimension, MonthlyReportDocument } from '../model/monthly-report.model';
import { firestore } from './firestore.service';
import { calculateSalesReport, parseReportRequest } from './report.service';

function projectionId(
  tenantId: string,
  year: number,
  month: number,
  dimensionType: MonthlyReportDimension,
  dimensionId: string,
): string {
  return [tenantId, `${year}-${String(month).padStart(2, '0')}`, dimensionType, dimensionId]
    .map((value) => encodeURIComponent(value).replaceAll('_', '%5F'))
    .join('__');
}

export async function rebuildMonthlyReport(
  tenantId: string,
  rawRequest: unknown,
): Promise<{ written: number; year: number; month: number }> {
  const request = parseReportRequest(rawRequest === undefined ? {} : rawRequest);
  if (request.productId || request.professionalId) {
    throw new HttpsError('invalid-argument', 'A reconstrução não aceita filtros dimensionais.');
  }

  const report = await calculateSalesReport(tenantId, request);
  const generatedAt = FieldValue.serverTimestamp();
  const records: Omit<MonthlyReportDocument, 'generatedAt' | 'updatedAt'>[] = [
    {
      tenantId,
      year: report.year,
      month: report.month,
      timezone: report.timezone,
      dimensionType: 'tenant',
      dimensionId: tenantId,
      totalSalesCents: report.totalSalesCents,
      totalCommissionCents: report.totalCommissionCents,
    },
    ...report.collaborators.map((item) => ({
      tenantId,
      year: report.year,
      month: report.month,
      timezone: report.timezone,
      dimensionType: 'professional' as const,
      dimensionId: item.professionalId,
      totalSalesCents: item.salesCents,
      totalCommissionCents: item.commissionCents,
    })),
    ...report.products.map((item) => ({
      tenantId,
      year: report.year,
      month: report.month,
      timezone: report.timezone,
      dimensionType: 'product' as const,
      dimensionId: item.productId,
      totalSalesCents: item.salesCents,
      totalCommissionCents: item.commissionCents,
    })),
  ];
  const projectionCollection = firestore.collection(collections.monthlyReports);
  const existing = await projectionCollection
    .where('tenantId', '==', tenantId)
    .where('year', '==', report.year)
    .where('month', '==', report.month)
    .get();
  const targetIds = new Set(
    records.map((record) =>
      projectionId(tenantId, report.year, report.month, record.dimensionType, record.dimensionId),
    ),
  );
  const operations = [
    ...existing.docs
      .filter((document) => !targetIds.has(document.id))
      .map((document) => ({ ref: document.ref, data: undefined })),
    ...records.map((record) => ({
      ref: projectionCollection.doc(
        projectionId(tenantId, report.year, report.month, record.dimensionType, record.dimensionId),
      ),
      data: {
        ...record,
        generatedAt,
        updatedAt: generatedAt,
      },
    })),
  ];

  for (let index = 0; index < operations.length; index += 450) {
    const batch = firestore.batch();
    for (const operation of operations.slice(index, index + 450)) {
      if (operation.data) batch.set(operation.ref, operation.data);
      else batch.delete(operation.ref);
    }
    await batch.commit();
  }

  return { written: records.length, year: report.year, month: report.month };
}
