import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import type { AppointmentStatus } from '@shared/appointment-status';
import type { CollaboratorAppointment } from '../../../interfaces/appointment.interface';
import { CurrencyUtil } from '../../../utils/currency.util';

type AppointmentCardProps = {
  appointment: CollaboratorAppointment;
  timezone: string;
  busy: boolean;
  onStatusChange: (appointmentId: string, status: AppointmentStatus) => void;
};

const statusLabels: Record<AppointmentStatus, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
  completed: 'Concluído',
};

export default function AppointmentCard({
  appointment,
  timezone,
  busy,
  onStatusChange,
}: Readonly<AppointmentCardProps>): JSX.Element {
  const date = new Intl.DateTimeFormat('pt-BR', {
    timeZone: timezone,
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(appointment.startsAt);

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
            {statusLabels[appointment.status]}
          </span>
        </div>
        <p className="appointment-card__service">{appointment.productNameSnapshot}</p>
        <p className="muted">
          {CurrencyUtil.formatPrice(appointment.productPriceCentsSnapshot)} ·{' '}
          {appointment.professionalNameSnapshot}
        </p>
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
