import type { AnalysisValue } from '../interfaces/analysis.interface';
import { MetricUtil } from './metric.util';

export class MarkdownUtil {
  public static readonly metricLabels: Record<string, string> = {
    appointmentCount: 'Agendamentos registrados',
    pendingAppointments: 'Agendamentos pendentes',
    confirmedAppointments: 'Agendamentos confirmados',
    cancelledAppointments: 'Agendamentos cancelados',
    completedAppointments: 'Agendamentos concluídos',
    completedSalesCents: 'Vendas concluídas',
    completedCommissionCents: 'Comissões concluídas',
    occupancy: 'Ocupação da agenda',
    periodComparison: 'Comparação entre períodos',
  };

  public static readonly priorityLabels: Record<string, string> = {
    high: 'Alta',
    medium: 'Média',
    low: 'Baixa',
  };

  public static formatReference(reference: string): string {
    return this.metricLabels[reference] ?? reference;
  }

  public static buildAnalysisMarkdown(analysis: AnalysisValue): string {
    const { report, metrics } = analysis;

    const sections = [
      '# Relatório de análise de negócio',
      '',
      '## Resumo executivo',
      report.summary,
      '',
      '## Indicadores do período',
      `- **Agendamentos registrados:** ${metrics.appointmentCount}`,
      `- **Agendamentos pendentes:** ${metrics.statusCounts.pending}`,
      `- **Agendamentos confirmados:** ${metrics.statusCounts.confirmed}`,
      `- **Agendamentos cancelados:** ${metrics.statusCounts.cancelled}`,
      `- **Agendamentos concluídos:** ${metrics.statusCounts.completed}`,
      `- **Vendas concluídas:** ${MetricUtil.formatMetricCurrency(metrics.completedSalesCents)}`,
      `- **Comissões concluídas:** ${MetricUtil.formatMetricCurrency(
        metrics.completedCommissionCents,
      )}`,
      `- **Ocupação da agenda:** ${MetricUtil.formatMetric(metrics.occupancy)}`,
      `- **Comparação entre períodos:** ${MetricUtil.formatMetric(metrics.periodComparison)}`,
      ...(metrics.coverage === 'no_data'
        ? ['', '> **Atenção:** não há dados de agendamentos no período analisado.']
        : []),
      '',
      ...(report.facts.length > 0
        ? [
            '## Fatos e evidências',
            '',
            ...report.facts.flatMap((fact) => [
              `- ${fact.statement}`,
              `  - **Fonte:** ${
                fact.source.type === 'web'
                  ? `[Fonte externa](${fact.source.reference})`
                  : this.formatReference(fact.source.reference)
              }`,
            ]),
            '',
          ]
        : []),
      ...(report.inferences.length > 0
        ? [
            '## Interpretações e incertezas',
            '',
            ...report.inferences.flatMap((item) => [
              `### ${item.statement}`,
              '',
              `**Incerteza:** ${item.uncertainty}`,
              ...(item.evidenceReferences.length > 0
                ? [
                    '',
                    `**Evidências relacionadas:** ${item.evidenceReferences
                      .map((reference) => {
                        const fact = report.facts.find((candidate) => candidate.id === reference);

                        return fact ? fact.statement : this.formatReference(reference);
                      })
                      .join('; ')}`,
                  ]
                : []),
              '',
            ]),
          ]
        : []),
      ...(report.recommendations.length > 0
        ? [
            '## Recomendações para avaliação',
            '',
            ...report.recommendations.flatMap((item) => [
              `### ${item.title}`,
              '',
              `**Prioridade:** ${this.priorityLabels[item.priority]}`,
              '',
              item.rationale,
              ...(item.evidenceReferences.length > 0
                ? [
                    '',
                    `**Evidências relacionadas:** ${item.evidenceReferences
                      .map((reference) => {
                        const fact = report.facts.find((candidate) => candidate.id === reference);

                        const inference = report.inferences.find(
                          (candidate) => candidate.id === reference,
                        );

                        return (
                          fact?.statement ?? inference?.statement ?? this.formatReference(reference)
                        );
                      })
                      .join('; ')}`,
                  ]
                : []),
              '',
            ]),
          ]
        : []),
      ...(report.limitations.length > 0
        ? [
            '## Limitações dos dados',
            '',
            ...report.limitations.map((limitation) => `- ${limitation}`),
            '',
          ]
        : []),
      ...(report.sources.length > 0
        ? [
            '## Fontes externas',
            '',
            ...report.sources.flatMap((source) => [
              `- [${source.title}](${source.url})`,
              `  ${source.snippet}`,
              '',
            ]),
          ]
        : []),
    ];

    return sections.join('\n').trim();
  }
}
