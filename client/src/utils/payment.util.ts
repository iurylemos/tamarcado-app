import type { PaymentMethod } from '@shared/interfaces/appointment.interface';

type PaymentOption = { value: PaymentMethod; label: string };

export class PaymentUtil {
  public static readonly options: ReadonlyArray<PaymentOption> = [
    { value: 'debit', label: 'Débito' },
    { value: 'credit', label: 'Crédito' },
    { value: 'cash', label: 'Dinheiro' },
    { value: 'pix', label: 'Pix' },
  ];

  public static paymentMethodLabel(method: PaymentMethod): string {
    return { debit: 'Débito', credit: 'Crédito', cash: 'Dinheiro', pix: 'Pix' }[method];
  }
}
