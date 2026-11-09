import { useState, type SubmitEvent, type JSX } from 'react';
import { formatBrazilianPhone, isValidBrazilianPhone } from '@shared/phone';
import type { PaymentMethod } from '@shared/interfaces/appointment.interface';
import type { BookingFormValues } from '../../../interfaces/booking.interface';
import { PaymentUtil } from '../../../utils/payment.util';
import Skeleton from '../../atoms/Skeleton/Skeleton';

type BookingFormProps = {
  onSubmit: (values: BookingFormValues) => Promise<void>;
  busy?: boolean;
  error?: string;
};

export default function BookingForm({
  onSubmit,
  busy = false,
  error = '',
}: Readonly<BookingFormProps>): JSX.Element {
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [whatsappOptIn, setWhatsappOptIn] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');
  const [installments, setInstallments] = useState<number>(1);
  const [validationError, setValidationError] = useState<string>('');
  const nameIsValid = customerName.trim().length > 0;
  const phoneIsValid = isValidBrazilianPhone(customerPhone);

  const updatePhone = (value: string): void => {
    setCustomerPhone(formatBrazilianPhone(value));
    setValidationError('');
  };

  const submit = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!nameIsValid) {
      setValidationError('Informe seu nome.');
      return;
    }
    if (!phoneIsValid) {
      setValidationError('Informe um celular válido com DDD.');
      return;
    }
    if (!whatsappOptIn) {
      setValidationError('Aceite receber mensagens pelo WhatsApp para solicitar o agendamento.');
      return;
    }
    if (!paymentMethod) {
      setValidationError('Selecione uma forma de pagamento.');
      return;
    }
    setValidationError('');
    await onSubmit({
      customerName: customerName.trim(),
      customerPhone,
      whatsappOptIn,
      paymentMethod,
      ...(paymentMethod === 'credit' ? { installments } : {}),
    });
  };

  return (
    <form className="stack booking-form" onSubmit={submit} noValidate>
      <label className="field" htmlFor="customer-name">
        Seu nome
        <input
          id="customer-name"
          autoComplete="name"
          value={customerName}
          onChange={(event) => {
            setCustomerName(event.target.value);
            if (event.target.value.trim()) setValidationError('');
          }}
          maxLength={100}
          aria-invalid={!nameIsValid && validationError === 'Informe seu nome.'}
          required
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
          onChange={(event) => updatePhone(event.target.value)}
          aria-describedby="phone-help"
          aria-invalid={customerPhone.length > 0 && !phoneIsValid}
          required
        />
        <span
          id="phone-help"
          className={customerPhone.length > 0 && !phoneIsValid ? 'error' : 'muted'}
        >
          {customerPhone.length > 0 && !phoneIsValid
            ? 'Informe um celular válido com DDD.'
            : 'Ex.: (11) 99999-0000'}
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
      <fieldset className="slot-fieldset">
        <legend>Forma de pagamento</legend>
        <div className="slot-grid" role="radiogroup" aria-label="Forma de pagamento">
          {PaymentUtil.options.map((option) => (
            <label
              key={option.value}
              className={`slot-option${paymentMethod === option.value ? ' is-selected' : ''}`}
            >
              <input
                type="radio"
                name="payment-method"
                value={option.value}
                checked={paymentMethod === option.value}
                onChange={() => {
                  setPaymentMethod(option.value);
                  setValidationError('');
                }}
                required
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>
      {paymentMethod === 'credit' && (
        <label className="field" htmlFor="payment-installments">
          Parcelas sem juros
          <select
            id="payment-installments"
            value={installments}
            onChange={(event) => setInstallments(Number(event.target.value))}
          >
            {[1, 2, 3, 4, 5].map((count) => (
              <option key={count} value={count}>
                {count}x
              </option>
            ))}
          </select>
        </label>
      )}
      <p className="muted">
        A forma de pagamento é apenas informativa. Nenhum pagamento será processado ou recebido
        agora.
      </p>
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
      <button
        className="button booking-submit"
        type="submit"
        disabled={busy || !nameIsValid || !whatsappOptIn || !phoneIsValid || !paymentMethod}
        aria-busy={busy}
      >
        {busy ? (
          <>
            <Skeleton className="booking-submit-skeleton" />
            <span className="skeleton-status">Enviando solicitação...</span>
          </>
        ) : (
          'Solicitar agendamento'
        )}
      </button>
    </form>
  );
}
