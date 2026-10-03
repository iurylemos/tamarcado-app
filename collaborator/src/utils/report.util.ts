import type { ReportPeriod } from '../interfaces/report.interface';

export class ReportUtil {
  public static currentPeriod(): ReportPeriod {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }

  public static periodInput(period: ReportPeriod): string {
    return `${period.year}-${String(period.month).padStart(2, '0')}`;
  }

  public static parsePeriod(value: string): ReportPeriod {
    const [year, month] = value.split('-').map(Number);
    if (!year || !month) throw new RangeError('Selecione um mês válido.');
    return { year, month };
  }
}
