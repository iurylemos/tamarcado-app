export interface ReportFilters {
  year: number;
  month: number;
  productId?: string;
  professionalId?: string;
}

export type ReportCsvExport = {
  csv: string;
  filename: string;
};

export type ReportProjectionRebuildResult = {
  written: number;
  year: number;
  month: number;
};
