export interface StartAnalysisRequest {
  idempotencyKey: string;
  goal: string;
  period: { start: string; endExclusive: string };
}

export interface StartAnalysisResponse {
  executionId: string;
  status: 'queued';
  createdAt: string;
}

export interface AnalysisMetric {
  available: boolean;
  value?: number;
  limitation?: string;
}

export interface AnalysisMetrics {
  coverage: 'sufficient' | 'no_data';
  appointmentCount: number;
  statusCounts: {
    pending: number;
    confirmed: number;
    cancelled: number;
    completed: number;
  };
  period: {
    start: string;
    endExclusive: string;
    timezone: string;
  };
  completedSalesCents: AnalysisMetric;
  completedCommissionCents: AnalysisMetric;
  occupancy: AnalysisMetric;
  periodComparison: AnalysisMetric;
}

export interface AnalysisReport {
  summary: string;
  period: {
    start: string;
    endExclusive: string;
  };
  facts: Array<{
    id: string;
    statement: string;
    source: { type: 'metric' | 'web'; reference: string };
  }>;
  inferences: Array<{
    id: string;
    statement: string;
    evidenceReferences: string[];
    uncertainty: string;
  }>;
  recommendations: Array<{
    id: string;
    title: string;
    rationale: string;
    priority: 'low' | 'medium' | 'high';
    evidenceReferences: string[];
  }>;
  limitations: string[];
  sources: Array<{ title: string; url: string; snippet: string }>;
}

export type GetAnalysisReportResponse =
  | {
      status: 'queued' | 'running' | 'failed' | 'timed_out' | 'cancelled';
      failureCode?: string;
    }
  | { status: 'succeeded'; metrics: AnalysisMetrics; report: AnalysisReport };

export type AnalysisValue = Extract<GetAnalysisReportResponse, { status: 'succeeded' }>;

export type AnalysisGoal = {
  min: number;
  max: number;
};

export type AnalysisKey = { signature: string; key: string };
