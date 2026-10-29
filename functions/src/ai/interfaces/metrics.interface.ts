import { AppointmentDocument } from '../../model/appointment.model';

export type MetricsAppointment = Pick<
  AppointmentDocument,
  | 'tenantId'
  | 'status'
  | 'productId'
  | 'productNameSnapshot'
  | 'productPriceCentsSnapshot'
  | 'commissionTypeSnapshot'
  | 'commissionValueSnapshot'
  | 'professionalId'
  | 'professionalNameSnapshot'
> & { startsAt: Date };
