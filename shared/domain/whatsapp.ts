import { normalizeBrazilianPhone } from './phone.js';

export interface AppointmentConfirmationInput {
  customerName?: string | undefined;
  businessName?: string | undefined;
  serviceName?: string | undefined;
  date: string;
  time: string;
}

const minInternationalDigits = 8;
const maxInternationalDigits = 15;

/**
 * Returns E.164 digits without "+" for wa.me, or null when the number is unusable.
 * Numbers with an explicit "+" or "00" prefix are treated as international; anything
 * else is validated as a Brazilian number.
 */
export function normalizeWhatsAppPhone(value: string | null | undefined): string | null {
  const raw = (value ?? '').trim();
  if (!raw) return null;

  const digits = raw.replace(/\D/g, '');
  const explicitInternational = raw.startsWith('+') || raw.startsWith('00');

  if (explicitInternational) {
    const international = raw.startsWith('00') ? digits.slice(2) : digits;
    const validLength =
      international.length >= minInternationalDigits &&
      international.length <= maxInternationalDigits;
    if (!validLength || international.startsWith('0')) return null;
    if (international.startsWith('55')) {
      const brazilian = normalizeBrazilianPhone(`+${international}`);
      return brazilian ? brazilian.slice(1) : null;
    }
    return international;
  }

  const brazilian = normalizeBrazilianPhone(digits);
  return brazilian ? brazilian.slice(1) : null;
}

export function buildAppointmentConfirmationMessage(
  input: AppointmentConfirmationInput,
): string | null {
  const date = input.date.trim();
  const time = input.time.trim();
  if (!date || !time) return null;

  const name = input.customerName?.trim();
  const service = input.serviceName?.trim();
  const business = input.businessName?.trim();

  return [
    `Olá${name ? `, ${name}` : ''}! Seu agendamento${service ? ` de ${service}` : ''}${
      business ? ` em ${business}` : ''
    } está confirmado para ${date} às ${time}.`,
    'Se precisar remarcar ou cancelar, é só responder esta mensagem.',
  ].join('\n');
}

export function buildWhatsAppUrl(
  phone: string | null | undefined,
  message: string | null | undefined,
): string | null {
  const normalized = normalizeWhatsAppPhone(phone);
  const text = message?.trim();
  if (!normalized || !text) return null;

  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
}

export function buildAppointmentConfirmationUrl(
  phone: string | null | undefined,
  input: AppointmentConfirmationInput,
): string | null {
  return buildWhatsAppUrl(phone, buildAppointmentConfirmationMessage(input));
}
