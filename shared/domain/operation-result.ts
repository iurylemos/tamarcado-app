import type { OperationResultData } from './interfaces/operation-result.interface';

export function toOperationError(error: unknown): OperationResultData {
  if (error instanceof Error) return { message: error.message, retryable: false };

  return { message: 'Não foi possível concluir a solicitação. Tente novamente.', retryable: true };
}
