import type { AppointmentStatus } from '@shared/appointment-status';

export class AppointmentUtil {
  public static readonly statusLabels: Record<AppointmentStatus, string> = {
    pending: 'Pendente',
    confirmed: 'Confirmado',
    cancelled: 'Cancelado',
    completed: 'Concluído',
  };
}
