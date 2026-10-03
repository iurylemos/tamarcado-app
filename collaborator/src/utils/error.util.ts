export class ErrorUtil {
  public static formatMessage(error: unknown, defaultMessage?: string): string {
    return error instanceof Error
      ? error.message
      : (defaultMessage ?? 'Não foi possível atualizar o agendamento.');
  }
}
