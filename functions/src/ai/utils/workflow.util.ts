import { AggregatedMetrics } from '../../model/ai-analysis.model';
import type { InsightsInput } from '../interfaces/insights.interface';
import { GrowthWorkflowDependencies } from '../interfaces/workflow.interface';
import { generateInsights } from '../providers/llm.provider';
import { searchMarketEvidence } from '../tools/tavily-search.tool';

export class WorkflowUtilStageError extends Error {
  constructor(
    readonly stage: 'research' | 'generation' | 'validation' | 'persist',
    readonly code: 'stage_unavailable' | 'deadline_exceeded' | 'checkpoint_incompatible',
  ) {
    super(code);
  }
}

export class WorkflowUtilStageTimeoutError extends Error {}

export class WorkflowUtil {
  public static readonly defaultDependencies: GrowthWorkflowDependencies = {
    search: (goal: string) => searchMarketEvidence(goal),
    generate: (input: InsightsInput, signal?: AbortSignal) =>
      generateInsights(input, undefined, signal),
    now: () => new Date(),
  };

  public static isMarketResearchRequired(goal: string): boolean {
    return /\b(mercado|concorr[eê]ncia|concorrentes|tend[eê]ncia|benchmark|setor|ind[uú]stria|pre[cç]o|demanda externa)\b/i.test(
      goal,
    );
  }

  public static sanitizeGoal(goal: string): string {
    return goal
      .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[dado removido]')
      .replace(/\b(?:\+?\d[\d\s().-]{7,}\d)\b/g, '[dado removido]')
      .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[dado removido]')
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 500);
  }

  public static validMetricReference(reference: string, metrics: AggregatedMetrics): boolean {
    switch (reference) {
      case 'appointmentCount':
        return true;
      case 'pendingAppointments':
        return true;
      case 'confirmedAppointments':
        return true;
      case 'cancelledAppointments':
        return true;
      case 'completedAppointments':
        return true;
      case 'completedSalesCents':
        return metrics.completedSalesCents.available;
      case 'completedCommissionCents':
        return metrics.completedCommissionCents.available;
      case 'occupancy':
        return metrics.occupancy.available;
      case 'periodComparison':
        return metrics.periodComparison.available;
      default:
        return false;
    }
  }
}
