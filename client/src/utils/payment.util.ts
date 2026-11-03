export class PaymentUtil {
  public static paymentMethodLabel(method: 'debit' | 'credit' | 'cash' | 'pix'): string {
    return { debit: 'Débito', credit: 'Crédito', cash: 'Dinheiro', pix: 'Pix' }[method];
  }
}
