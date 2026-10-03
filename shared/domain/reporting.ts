import type { AppointmentStatus } from './appointment-status.js';
import type { CommissionType } from './interfaces/product.interface.js';
import { calculateSnapshotCommission } from './commission.js';
import { localDateTimeToUtc } from './timezone.js';

export interface ReportingPeriod {
  year: number;
  month: number;
  timezone: string;
  startsAt: Date;
  endsAt: Date;
}

export interface SalesAppointment {
  id?: string;
  tenantId: string;
  status: AppointmentStatus;
  startsAt: Date;
  productId: string;
  productNameSnapshot: string;
  productPriceCentsSnapshot: number;
  commissionTypeSnapshot: CommissionType;
  commissionValueSnapshot: number;
  professionalId: string;
  professionalNameSnapshot: string;
  customerPhoneE164?: string;
}

export interface SalesReportFilters {
  tenantId: string;
  period: ReportingPeriod;
  productId?: string;
  professionalId?: string;
}

export interface SalesReportRow {
  startsAt: string;
  productId: string;
  productName: string;
  professionalId: string;
  professionalName: string;
  salesCents: number;
  commissionCents: number;
}

export interface SalesBreakdown {
  professionalId: string;
  professionalName: string;
  salesCents: number;
  commissionCents: number;
  appointmentCount: number;
}

export interface ProductSalesBreakdown {
  productId: string;
  productName: string;
  salesCents: number;
  commissionCents: number;
  appointmentCount: number;
}

export interface SalesReport {
  year: number;
  month: number;
  timezone: string;
  totalSalesCents: number;
  totalCommissionCents: number;
  appointmentCount: number;
  rows: SalesReportRow[];
  collaborators: SalesBreakdown[];
  products: ProductSalesBreakdown[];
}

export function getReportingPeriod(year: number, month: number, timezone: string): ReportingPeriod {
  if (
    !Number.isSafeInteger(year) ||
    year < 2000 ||
    year > 9999 ||
    !Number.isSafeInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    throw new RangeError('Year and month must identify a supported calendar month.');
  }

  const monthText = String(month).padStart(2, '0');
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonthText = String(nextMonth).padStart(2, '0');

  return {
    year,
    month,
    timezone,
    startsAt: localDateTimeToUtc(`${year}-${monthText}-01`, '00:00', timezone),
    endsAt: localDateTimeToUtc(`${nextYear}-${nextMonthText}-01`, '00:00', timezone),
  };
}

function addCents(current: number, value: number): number {
  const sum = current + value;
  if (!Number.isSafeInteger(sum))
    throw new RangeError('Report total exceeds the supported amount.');
  return sum;
}

function bySalesThenName<
  T extends { salesCents: number; professionalName?: string; productName?: string },
>(left: T, right: T): number {
  return (
    right.salesCents - left.salesCents ||
    (left.professionalName ?? left.productName ?? '').localeCompare(
      right.professionalName ?? right.productName ?? '',
      'pt-BR',
    )
  );
}

export function summarizeSales(
  appointments: readonly SalesAppointment[],
  filters: SalesReportFilters,
): SalesReport {
  const rows: SalesReportRow[] = [];
  const collaborators = new Map<string, SalesBreakdown>();
  const products = new Map<string, ProductSalesBreakdown>();
  let totalSalesCents = 0;
  let totalCommissionCents = 0;

  for (const appointment of appointments) {
    if (
      appointment.tenantId !== filters.tenantId ||
      appointment.status !== 'completed' ||
      appointment.startsAt < filters.period.startsAt ||
      appointment.startsAt >= filters.period.endsAt ||
      (filters.productId && appointment.productId !== filters.productId) ||
      (filters.professionalId && appointment.professionalId !== filters.professionalId)
    ) {
      continue;
    }

    const commissionCents = calculateSnapshotCommission(
      appointment.productPriceCentsSnapshot,
      appointment.commissionTypeSnapshot,
      appointment.commissionValueSnapshot,
    );
    const salesCents = appointment.productPriceCentsSnapshot;
    totalSalesCents = addCents(totalSalesCents, salesCents);
    totalCommissionCents = addCents(totalCommissionCents, commissionCents);
    rows.push({
      startsAt: appointment.startsAt.toISOString(),
      productId: appointment.productId,
      productName: appointment.productNameSnapshot,
      professionalId: appointment.professionalId,
      professionalName: appointment.professionalNameSnapshot,
      salesCents,
      commissionCents,
    });

    const collaborator = collaborators.get(appointment.professionalId) ?? {
      professionalId: appointment.professionalId,
      professionalName: appointment.professionalNameSnapshot,
      salesCents: 0,
      commissionCents: 0,
      appointmentCount: 0,
    };
    collaborator.salesCents = addCents(collaborator.salesCents, salesCents);
    collaborator.commissionCents = addCents(collaborator.commissionCents, commissionCents);
    collaborator.appointmentCount += 1;
    collaborators.set(appointment.professionalId, collaborator);

    const product = products.get(appointment.productId) ?? {
      productId: appointment.productId,
      productName: appointment.productNameSnapshot,
      salesCents: 0,
      commissionCents: 0,
      appointmentCount: 0,
    };
    product.salesCents = addCents(product.salesCents, salesCents);
    product.commissionCents = addCents(product.commissionCents, commissionCents);
    product.appointmentCount += 1;
    products.set(appointment.productId, product);
  }

  rows.sort(
    (left, right) =>
      left.startsAt.localeCompare(right.startsAt) ||
      left.professionalName.localeCompare(right.professionalName, 'pt-BR'),
  );
  const collaboratorRows = [...collaborators.values()].sort(bySalesThenName);
  const productRows = [...products.values()].sort((left, right) => {
    return (
      right.salesCents - left.salesCents ||
      left.productName.localeCompare(right.productName, 'pt-BR')
    );
  });

  return {
    year: filters.period.year,
    month: filters.period.month,
    timezone: filters.period.timezone,
    totalSalesCents,
    totalCommissionCents,
    appointmentCount: rows.length,
    rows,
    collaborators: collaboratorRows,
    products: productRows,
  };
}

export function getTopCollaborators(
  collaborators: readonly SalesBreakdown[],
): readonly SalesBreakdown[] {
  return collaborators.length >= 3 ? collaborators.slice(0, 3) : [];
}

function csvCell(value: string): string {
  const safeValue = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safeValue.replaceAll('"', '""')}"`;
}

function formatCsvCents(cents: number): string {
  const value = BigInt(cents);
  return `${value / 100n}.${String(value % 100n).padStart(2, '0')}`;
}

export function buildSalesCsv(rows: readonly SalesReportRow[], timezone: string): string {
  const header = ['Data', 'Serviço', 'Colaborador', 'Vendas', 'Comissão'];
  const lines = rows.map((row) => [
    new Intl.DateTimeFormat('pt-BR', {
      timeZone: timezone,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(row.startsAt)),
    row.productName,
    row.professionalName,
    formatCsvCents(row.salesCents),
    formatCsvCents(row.commissionCents),
  ]);
  return [header, ...lines].map((line) => line.map((cell) => csvCell(cell)).join(',')).join('\r\n');
}
