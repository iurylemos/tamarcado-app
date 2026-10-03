import type { JSX } from 'react';
import type { CollaboratorCustomer } from '../../../interfaces/appointment.interface';
import { PhoneUtil } from '../../../utils/phone.util';

type CustomerHistoryProps = {
  customer: CollaboratorCustomer;
  timezone: string;
};

export default function CustomerHistory({ customer, timezone }: CustomerHistoryProps): JSX.Element {
  const latestAppointment = new Intl.DateTimeFormat('pt-BR', {
    timeZone: timezone,
    dateStyle: 'medium',
  }).format(new Date(customer.latestAppointmentAt));

  const attendance =
    customer.latestAttendanceMonth && customer.latestAttendanceYear
      ? `${String(customer.latestAttendanceMonth).padStart(2, '0')}/${customer.latestAttendanceYear}`
      : 'Sem atendimentos concluídos';

  const whatsappUrl = `https://wa.me/${customer.phoneE164.replace(/\D/g, '')}?text=${encodeURIComponent(
    `Olá${customer.name ? `, ${customer.name}` : ''}. Estou entrando em contato sobre seu atendimento.`,
  )}`;

  return (
    <article className="customer-card">
      <div>
        <h2>{customer.name || 'Cliente'}</h2>
        <p className="muted" aria-label="Telefone protegido">
          {PhoneUtil.maskedPhone(customer.phoneE164)}
        </p>
      </div>
      <dl className="customer-card__history">
        <div>
          <dt>Atendimentos concluídos</dt>
          <dd>{customer.completedAttendanceCount}</dd>
        </div>
        <div>
          <dt>Último atendimento concluído</dt>
          <dd>{attendance}</dd>
        </div>
        <div>
          <dt>Último agendamento</dt>
          <dd>{latestAppointment}</dd>
        </div>
      </dl>
      {customer.canContactOnWhatsApp ? (
        <a href={whatsappUrl} target="_blank" rel="noreferrer">
          Abrir WhatsApp
        </a>
      ) : (
        <span className="muted" aria-label="Contato indisponível sem consentimento">
          WhatsApp indisponível
        </span>
      )}
    </article>
  );
}
