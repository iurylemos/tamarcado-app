import { useState, type FormEvent, type JSX } from 'react';
import { isValidBrazilianPhone } from '@shared/phone';

export type BookingFormValues = {
  customerName: string;
  customerPhone: string;
  whatsappOptIn: boolean;
};

type BookingFormProps = {
  onSubmit: (values: BookingFormValues) => Promise<void>;
  busy?: boolean;
  error?: string;
};

export default function BookingForm({
  onSubmit,
  busy = false,
  error = '',
}: BookingFormProps): JSX.Element {
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [whatsappOptIn, setWhatsappOptIn] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string>('');

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!isValidBrazilianPhone(customerPhone)) {
      setValidationError('Informe um telefone brasileiro válido com DDD.');
      return;
    }
    if (!whatsappOptIn) {
      setValidationError('Aceite receber mensagens pelo WhatsApp para solicitar o agendamento.');
      return;
    }
    setValidationError('');
    await onSubmit({ customerName: customerName.trim(), customerPhone, whatsappOptIn });
  };

  return (
    <form className="stack booking-form" onSubmit={submit} noValidate>
      <label className="field" htmlFor="customer-name">
        Seu nome (opcional)
        <input
          id="customer-name"
          autoComplete="name"
          value={customerName}
          onChange={(event) => setCustomerName(event.target.value)}
          maxLength={100}
        />
      </label>
      <label className="field" htmlFor="customer-phone">
        Celular com DDD
        <input
          id="customer-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={customerPhone}
          onChange={(event) => setCustomerPhone(event.target.value)}
          aria-describedby="phone-help"
          required
        />
        <span id="phone-help" className="muted">
          Ex.: (11) 99999-0000
        </span>
      </label>
      <label className="whatsapp-consent">
        <input
          type="checkbox"
          checked={whatsappOptIn}
          onChange={(event) => setWhatsappOptIn(event.target.checked)}
        />{' '}
        Aceito receber mensagens deste estabelecimento pelo WhatsApp sobre este agendamento.
      </label>
      {validationError && (
        <p role="alert" className="error">
          {validationError}
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <button className="button booking-submit" type="submit" disabled={busy || !whatsappOptIn}>
        {busy ? 'Enviando solicitação...' : 'Solicitar agendamento'}
      </button>
    </form>
  );
}
