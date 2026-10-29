export class MetricsUtilLimitExceededError extends Error {
  constructor() {
    super('metrics_limit_exceeded');
  }
}

export class MetricsUtilUnavailableError extends Error {
  constructor() {
    super('metrics_unavailable');
  }
}

export class MetricsUtil {
  public static readonly maxMetricsAppointments = 5000;
}
