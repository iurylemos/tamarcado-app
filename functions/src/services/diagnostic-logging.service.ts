import { logger } from 'firebase-functions';
import { HttpsError } from 'firebase-functions/v2/https';

export type DiagnosticContext = {
  functionName: 'createPublicAppointment' | 'renderStorefront' | 'processAppointmentNotification';
  operation: 'appointment_booking' | 'storefront_render' | 'appointment_notification';
  stage: 'callable' | 'render' | 'worker';
  correlationId?: string;
};

const safeErrorCategories: Readonly<Record<string, string>> = {
  Error: 'unexpected',
  TypeError: 'type_error',
  RangeError: 'range_error',
  SyntaxError: 'syntax_error',
  ReferenceError: 'reference_error',
};

const opaqueUuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function safeCorrelationId(correlationId: string | undefined): string | undefined {
  return correlationId && opaqueUuidPattern.test(correlationId) ? correlationId : undefined;
}

function safeErrorCategory(error: unknown): string {
  if (!(error instanceof Error)) return 'unexpected';
  return safeErrorCategories[error.name] ?? 'unexpected';
}

function reportLoggingFailure(): void {
  console.error('Structured diagnostic logging failed.');
}

export function logUnexpectedFailure(context: DiagnosticContext, error: unknown): void {
  const correlationId = safeCorrelationId(context.correlationId);
  try {
    logger.error('operation.unexpected_failure', {
      functionName: context.functionName,
      operation: context.operation,
      stage: context.stage,
      outcome: 'failure',
      errorCategory: safeErrorCategory(error),
      ...(correlationId ? { correlationId } : {}),
    });
  } catch {
    reportLoggingFailure();
  }
}

export function logProviderDeliveryFailure(): void {
  try {
    logger.warn('notification.delivery_failed', {
      functionName: 'processAppointmentNotification',
      operation: 'appointment_notification',
      stage: 'provider_delivery',
      outcome: 'failure',
      errorCategory: 'provider_delivery_failed',
    });
  } catch {
    reportLoggingFailure();
  }
}

export async function runCallableWithDiagnostics<T>(
  context: DiagnosticContext,
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error: unknown) {
    if (error instanceof HttpsError) throw error;

    logUnexpectedFailure(context, error);
    throw new HttpsError('internal', 'INTERNAL');
  }
}
