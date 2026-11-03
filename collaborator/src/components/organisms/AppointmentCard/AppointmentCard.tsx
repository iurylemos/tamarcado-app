import { useMemo, type JSX } from 'react';
import { Link } from 'react-router-dom';
import type { AppointmentStatus } from '@shared/appointment-status';
import type { CollaboratorAppointment } from '../../../interfaces/appointment.interface';
import { CurrencyUtil } from '../../../utils/currency.util';
import { DateUtil } from '../../../utils/date.util';
import { PaymentUtil } from '../../../utils/payment.util';
import { AppointmentUtil } from '../../../utils/appointment.util';

type AppointmentCardData = {
  estimatedDate: string | undefined;
  paymentMethod: string | undefined;
  installments: number | undefined;
  estimatedDays: number | undefined;
  originalPriceCents: number | undefined;
  originalPrice: number | undefined;
  date: string;
};

type AppointmentCardProps = {
  appointment: CollaboratorAppointment;
  timezone: string;
  busy: boolean;
  onStatusChange: (appointmentId: string, status: AppointmentStatus) => void;
};

export default function AppointmentCard({
  appointment,
  timezone,
  busy,
  onStatusChange,
}: Readonly<AppointmentCardProps>): JSX.Element {
  const { estimatedDate, paymentMethod, installments, estimatedDays, originalPrice, date } =
    useMemo<AppointmentCardData>(() => {
      const estimatedDate = appointment.estimatedDeliveryDateSnapshot
        ? DateUtil.formatEstimatedDate(appointment.estimatedDeliveryDateSnapshot)
        : undefined;

      const paymentMethod = appointment.paymentMethodSnapshot
        ? PaymentUtil.paymentMethodLabels[appointment.paymentMethodSnapshot]
        : undefined;

      const installmentCount = appointment.installmentsSnapshot;

      const installments =
        appointment.paymentMethodSnapshot === 'credit' &&
        typeof installmentCount === 'number' &&
        Number.isInteger(installmentCount) &&
        installmentCount >= 1 &&
        installmentCount <= 5
          ? installmentCount
          : undefined;
      const estimatedDays = appointment.estimatedDeliveryDaysSnapshot;
      const originalPriceCents = appointment.productOriginalPriceCentsSnapshot;

      const originalPrice =
        typeof originalPriceCents === 'number' &&
        Number.isSafeInteger(originalPriceCents) &&
        originalPriceCents >= 0
          ? originalPriceCents
          : undefined;

      const date = new Intl.DateTimeFormat('pt-BR', {
        timeZone: timezone,
        dateStyle: 'long',
        timeStyle: 'short',
      }).format(appointment.startsAt);

      return {
        estimatedDate,
        paymentMethod,
        installments,
        estimatedDays,
        originalPriceCents,
        originalPrice,
        date,
      };
    }, [appointment, timezone]);

  return (
    <article className="appointment-card">
      <div className="appointment-card__image">
        {appointment.productImageUrlSnapshot ? (
          <img src={appointment.productImageUrlSnapshot} alt="" loading="lazy" />
        ) : (
          <span aria-hidden="true">Serviço</span>
        )}
      </div>
      <div className="appointment-card__content">
        <div className="appointment-card__heading">
          <div>
            <p className="eyebrow">{date}</p>
            <h2>{appointment.customerName || 'Cliente'}</h2>
          </div>
          <span className={`status-badge status-badge--${appointment.status}`}>
            {AppointmentUtil.statusLabels[appointment.status]}
          </span>
        </div>
        <p className="appointment-card__service">{appointment.productNameSnapshot}</p>
        <p className="muted">
          Valor registrado: {CurrencyUtil.formatPrice(appointment.productPriceCentsSnapshot)} ·{' '}
          {appointment.professionalNameSnapshot}
        </p>
        {appointment.promotionSnapshot?.promotionApplied && (
          <p className="muted">
            Promoção aplicada
            {originalPrice !== undefined && (
              <>
                {' · preço original: '}
                <del>{CurrencyUtil.formatPrice(originalPrice)}</del>
              </>
            )}
          </p>
        )}
        {typeof estimatedDays === 'number' &&
          Number.isSafeInteger(estimatedDays) &&
          estimatedDays > 0 && (
            <p className="muted">
              Prazo estimado: até {estimatedDays} {estimatedDays === 1 ? 'dia' : 'dias'} corridos
            </p>
          )}
        {estimatedDate && (
          <p className="muted">
            Previsão registrada: {estimatedDate} (estimativa, não é o horário do agendamento)
            {appointment.estimatedDeliveryTimezoneSnapshot &&
              ` · fuso ${appointment.estimatedDeliveryTimezoneSnapshot}`}
          </p>
        )}
        {paymentMethod && (
          <p className="muted">
            Pagamento informado: {paymentMethod}
            {installments
              ? ` em ${installments} ${installments === 1 ? 'parcela' : 'parcelas'}`
              : ''}
            {' · não processado'}
          </p>
        )}
        {appointment.customizationSnapshot && appointment.customizationSnapshot.length > 0 && (
          <ul className="appointment-card__customizations">
            {appointment.customizationSnapshot.map((selection) => (
              <li key={selection.attributeId}>
                <strong>{selection.attributeLabel}:</strong> {selection.optionLabel}
              </li>
            ))}
          </ul>
        )}
        <div className="appointment-card__actions">
          {appointment.status === 'pending' && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => onStatusChange(appointment.id, 'confirmed')}
              >
                Confirmar
              </button>
              <button
                type="button"
                className="button button--secondary"
                disabled={busy}
                onClick={() => onStatusChange(appointment.id, 'cancelled')}
              >
                Cancelar
              </button>
            </>
          )}
          {appointment.status === 'confirmed' && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onStatusChange(appointment.id, 'completed')}
            >
              Marcar como concluído
            </button>
          )}
          {(appointment.status === 'pending' || appointment.status === 'confirmed') && (
            <Link className="button button--secondary" to={`/appointments/${appointment.id}`}>
              Reagendar
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
