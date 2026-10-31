import { describe, expect, it } from 'vitest';
import {
  buildAppointmentConfirmationMessage,
  buildAppointmentConfirmationUrl,
  buildWhatsAppUrl,
  normalizeWhatsAppPhone,
} from '@shared/whatsapp';

const appointment = {
  customerName: 'Maria Silva',
  serviceName: 'Corte',
  date: '10 de novembro de 2026',
  time: '14:30',
};

describe('normalizeWhatsAppPhone', () => {
  it.each([
    ['(11) 99999-0009', '5511999990009'],
    ['11999990009', '5511999990009'],
    ['+5511999990009', '5511999990009'],
    ['5511999990009', '5511999990009'],
    ['(11) 3333-4444', '551133334444'],
  ])('normalizes Brazilian number %s', (input, expected) => {
    expect(normalizeWhatsAppPhone(input)).toBe(expected);
  });

  it.each([
    ['+1 (415) 555-2671', '14155552671'],
    ['+351 912 345 678', '351912345678'],
    ['0044 7911 123456', '447911123456'],
  ])('keeps international number %s as digits only', (input, expected) => {
    expect(normalizeWhatsAppPhone(input)).toBe(expected);
  });

  it.each([undefined, null, '', '   ', 'abc', '123', '(00) 99999-0009', '+55 11 1234', '+0123456789'])(
    'rejects missing or invalid number %s',
    (input) => {
      expect(normalizeWhatsAppPhone(input)).toBeNull();
    },
  );
});

describe('buildAppointmentConfirmationMessage', () => {
  it('personalizes the message', () => {
    const message = buildAppointmentConfirmationMessage({ ...appointment, businessName: 'Studio' });
    expect(message).toContain('Olá, Maria Silva!');
    expect(message).toContain('de Corte em Studio');
    expect(message).toContain('10 de novembro de 2026 às 14:30');
  });

  it('works without optional fields', () => {
    expect(buildAppointmentConfirmationMessage({ date: '10/11', time: '09:00' })).toContain(
      'Olá! Seu agendamento está confirmado para 10/11 às 09:00.',
    );
  });

  it.each([
    { ...appointment, date: '' },
    { ...appointment, time: '  ' },
  ])('returns null when the date or time is missing', (input) => {
    expect(buildAppointmentConfirmationMessage(input)).toBeNull();
  });
});

describe('buildWhatsAppUrl', () => {
  it('builds a wa.me URL with an encoded message', () => {
    const url = buildWhatsAppUrl('(11) 99999-0009', 'Olá & tchau? 100%');
    expect(url).toBe(`https://wa.me/5511999990009?text=${encodeURIComponent('Olá & tchau? 100%')}`);
    expect(url).not.toContain('+');
  });

  it('returns null for an invalid phone or empty message', () => {
    expect(buildWhatsAppUrl('123', 'Oi')).toBeNull();
    expect(buildWhatsAppUrl(undefined, 'Oi')).toBeNull();
    expect(buildWhatsAppUrl('11999990009', '  ')).toBeNull();
  });
});

describe('buildAppointmentConfirmationUrl', () => {
  it('generates the final URL without exposing the phone in the message', () => {
    const url = buildAppointmentConfirmationUrl('+5511999990009', appointment)!;
    expect(url.startsWith('https://wa.me/5511999990009?text=')).toBe(true);
    expect(decodeURIComponent(url.split('?text=')[1]!)).toContain('Maria Silva');
    expect(decodeURIComponent(url.split('?text=')[1]!)).not.toContain('99999');
  });

  it('returns null when appointment information is missing', () => {
    expect(buildAppointmentConfirmationUrl('+5511999990009', { ...appointment, time: '' })).toBeNull();
  });
});
