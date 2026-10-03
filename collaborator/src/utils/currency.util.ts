export class CurrencyUtil {
  public static formatPrice(priceCents: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
      priceCents / 100,
    );
  }
}
