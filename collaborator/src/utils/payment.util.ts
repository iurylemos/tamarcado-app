import type { PaymentMethod } from '@shared/interfaces/appointment.interface';

export class PaymentUtil {
  public static readonly paymentMethodLabels: Record<PaymentMethod, string> = {
    debit: 'Débito',
    credit: 'Crédito',
    cash: 'Dinheiro',
    pix: 'Pix',
  };
}
