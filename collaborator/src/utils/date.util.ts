export class DateUtil {
  public static formatEstimatedDate(value: string): string | undefined {
    const date = new Date(`${value}T12:00:00.000Z`);

    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
      return undefined;
    }

    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'UTC',
      dateStyle: 'long',
    }).format(date);
  }
}
