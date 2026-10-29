export class MetricUtil {
  public static formatMetric(metric: {
    available: boolean;
    value?: number;
    limitation?: string;
  }): string {
    return metric.available && metric.value !== undefined
      ? new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(metric.value)
      : `Indisponível — ${metric.limitation ?? 'dados insuficientes'}`;
  }

  public static formatMetricCurrency(metric: {
    available: boolean;
    value?: number;
    limitation?: string;
  }): string {
    return metric.available && metric.value !== undefined
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
          metric.value / 100,
        )
      : `Indisponível — ${metric.limitation ?? 'dados insuficientes'}`;
  }
}
