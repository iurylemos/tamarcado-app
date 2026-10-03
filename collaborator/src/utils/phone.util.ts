export class PhoneUtil {
  public static maskedPhone(phone: string): string {
    return `**** ${phone.slice(-4)}`;
  }
}
