import { useEffect, useMemo, useState, type JSX, type SubmitEvent } from 'react';
import {
  appointmentLocalDate,
  listAppointments,
  subscribeToAppointments,
  updateAppointmentStatus,
} from '../services/appointment.service';
import type { CollaboratorAppointment } from '../interfaces/appointment.interface';
import type { AppointmentStatus } from '@shared/appointment-status';
import { ErrorUtil } from '../utils/error.util';
import AppointmentCard from '../components/organisms/AppointmentCard/AppointmentCard';

export default function AppointmentsPage(): JSX.Element {
  const [appointments, setAppointments] = useState<CollaboratorAppointment[]>([]);
  const [timezone, setTimezone] = useState<string>('America/Sao_Paulo');
  const [date, setDate] = useState<string>('');
  const [appliedDate, setAppliedDate] = useState<string>('');
  const [busyId, setBusyId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    void listAppointments({})
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
    if (appliedDate) {
      return appointments.filter(
        (appointment) => appointmentLocalDate(appointment.startsAt, timezone) === appliedDate,
      );
    }

    return appointments;
  }, [appointments, appliedDate, timezone]);

  const loadAppointments = async (filterDate: string): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      const result = await listAppointments(filterDate ? { date: filterDate } : {});
      setTimezone(result.timezone);
      setAppointments(result.appointments);
      setDate(filterDate);
      setAppliedDate(filterDate);
    } catch (loadError: unknown) {
      setError(ErrorUtil.formatMessage(loadError));
    } finally {
      setLoading(false);
    }
  };

  const applyDateFilter = (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void loadAppointments(date);
  };

  const changeStatus = async (appointmentId: string, status: AppointmentStatus): Promise<void> => {
    setBusyId(appointmentId);
    setError('');
    try {
      await updateAppointmentStatus(appointmentId, status);
      const result = await listAppointments(appliedDate ? { date: appliedDate } : {});
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
        <form className="report-filters" onSubmit={applyDateFilter}>
          <label className="date-filter">
            Filtrar por data
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? 'Filtrando...' : 'Filtrar'}
          </button>
          {(date || appliedDate) && (
            <button
              type="button"
              className="button--secondary"
              disabled={loading}
              onClick={() => void loadAppointments('')}
            >
              Limpar
            </button>
          )}
        </form>
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
          <h2>{appliedDate ? 'Nenhum horário nesta data' : 'Sua agenda está vazia'}</h2>
          <p className="muted">
            {appliedDate
              ? 'Limpe o filtro para ver os outros agendamentos.'
              : 'Novos agendamentos aparecerão aqui.'}
          </p>
          {appliedDate && (
            <button
              type="button"
              className="button button--secondary"
              disabled={loading}
              onClick={() => void loadAppointments('')}
            >
              Limpar filtro
            </button>
          )}
        </div>
      )}
    </section>
  );
}
