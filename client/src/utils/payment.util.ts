import type { PaymentMethod } from '@shared/interfaces/appointment.interface';

export class PaymentUtil {
  public static paymentMethodLabel(method: PaymentMethod): string {
    return { debit: 'Débito', credit: 'Crédito', cash: 'Dinheiro', pix: 'Pix' }[method];
  }
}
