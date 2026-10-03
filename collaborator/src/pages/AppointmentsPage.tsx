import { useEffect, useMemo, useState, type JSX } from 'react';
import {
  appointmentLocalDate,
  listAppointments,
  subscribeToAppointments,
  updateAppointmentStatus,
} from '../services/appointment.service';
import { ErrorUtil } from '../utils/error.util';
import type { CollaboratorAppointment } from '../interfaces/appointment.interface';
import type { AppointmentStatus } from '@shared/appointment-status';
import AppointmentCard from '../components/organisms/AppointmentCard/AppointmentCard';

export default function AppointmentsPage(): JSX.Element {
  const [appointments, setAppointments] = useState<CollaboratorAppointment[]>([]);
  const [timezone, setTimezone] = useState<string>('America/Sao_Paulo');
  const [date, setDate] = useState<string>('');
  const [busyId, setBusyId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    void listAppointments()
      .then((result) => {
        if (!active) return;
        setTimezone(result.timezone);
        setAppointments(result.appointments);
        setLoading(false);
        return subscribeToAppointments(
          (nextAppointments) => {
            if (active) setAppointments(nextAppointments);
          },
          (subscriptionError) => {
            if (active) setError(subscriptionError.message);
          },
        );
      })
      .then((stop) => {
        if (active && stop) unsubscribe = stop;
        else stop?.();
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setError(ErrorUtil.formatMessage(loadError));
        setLoading(false);
      });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  const visibleAppointments = useMemo<CollaboratorAppointment[]>(() => {
    if (date) {
      return appointments.filter(
        (appointment) => appointmentLocalDate(appointment.startsAt, timezone) === date,
      );
    }

    return appointments;
  }, [appointments, date, timezone]);

  const changeStatus = async (appointmentId: string, status: AppointmentStatus): Promise<void> => {
    setBusyId(appointmentId);
    setError('');
    try {
      await updateAppointmentStatus(appointmentId, status);
      const result = await listAppointments();
      setAppointments(result.appointments);
    } catch (actionError: unknown) {
      setError(ErrorUtil.formatMessage(actionError));
    } finally {
      setBusyId('');
    }
  };

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Rotina da equipe</p>
          <h1>Agendamentos</h1>
          <p className="muted">Acompanhe os horários e atualize cada atendimento.</p>
        </div>
        <label className="date-filter">
          Filtrar por data
          <span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            {date && (
              <button type="button" className="text-button" onClick={() => setDate('')}>
                Limpar
              </button>
            )}
          </span>
        </label>
      </header>
      {error && (
        <p className="feedback feedback--error" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">Carregando agendamentos...</p>
      ) : visibleAppointments.length ? (
        <div className="appointment-list">
          {visibleAppointments.map((appointment) => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              timezone={timezone}
              busy={busyId === appointment.id}
              onStatusChange={(id, status) => void changeStatus(id, status)}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>{date ? 'Nenhum horário nesta data' : 'Sua agenda está vazia'}</h2>
          <p className="muted">
            {date
              ? 'Limpe o filtro para ver os outros agendamentos.'
              : 'Novos agendamentos aparecerão aqui.'}
          </p>
          {date && (
            <button type="button" className="button button--secondary" onClick={() => setDate('')}>
              Limpar filtro
            </button>
          )}
        </div>
      )}
    </section>
  );
}
