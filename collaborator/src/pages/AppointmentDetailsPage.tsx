import { useEffect, useState, type JSX } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AppointmentEditor from '../components/organisms/AppointmentEditor/AppointmentEditor';
import type {
  CollaboratorAppointment,
  EligibleProfessional,
} from '../interfaces/appointment.interface';
import {
  listAppointments,
  listEligibleProfessionals,
  rescheduleAppointment,
} from '../services/appointment.service';
import { localDateTimeToUtc } from '@shared/timezone';
import { ErrorUtil } from '../utils/error.util';

export default function AppointmentDetailsPage(): JSX.Element {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState<CollaboratorAppointment>();
  const [professionals, setProfessionals] = useState<EligibleProfessional[]>([]);
  const [timezone, setTimezone] = useState<string>('America/Sao_Paulo');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let active = true;

    if (!appointmentId) {
      setError('Agendamento não encontrado.');
      setLoading(false);
      return () => {
        active = false;
      };
    }

    void Promise.all([listAppointments(), listEligibleProfessionals(appointmentId)])
      .then(([result, options]) => {
        if (!active) return;

        const findAppointment = result.appointments.find((item) => item.id === appointmentId);

        if (!findAppointment) {
          setError('Agendamento não encontrado no seu escopo de acesso.');
          return;
        }

        setTimezone(result.timezone);

        setAppointment(findAppointment);
        setProfessionals(options);

        if (!result.appointments.some((item) => item.id === appointmentId)) {
          setError('Agendamento não encontrado no seu escopo de acesso.');
        }

        setLoading(false);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setError(ErrorUtil.formatMessage(loadError));
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [appointmentId]);

  const save = async (startsAt: string, professionalId: string): Promise<void> => {
    if (!appointment || !appointmentId) return;
    setSaving(true);
    setError('');
    try {
      const utcStart = localDateTimeToUtc(startsAt.slice(0, 10), startsAt.slice(11, 16), timezone);
      await rescheduleAppointment({
        appointmentId,
        startsAt: utcStart.toISOString(),
        professionalId,
      });
      navigate('/appointments');
    } catch (saveError: unknown) {
      setError(ErrorUtil.formatMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <p className="page" role="status">
        Carregando agendamento…
      </p>
    );
  }

  if (!appointment) {
    return (
      <section className="page">
        <p className="feedback feedback--error" role="alert">
          {error || 'Agendamento não encontrado.'}
        </p>
        <Link to="/appointments">Voltar para agenda</Link>
      </section>
    );
  }

  return (
    <section className="page page--narrow">
      {error && (
        <p className="feedback feedback--error" role="alert">
          {error}
        </p>
      )}
      <AppointmentEditor
        appointment={appointment}
        professionals={professionals}
        timezone={timezone}
        saving={saving}
        onSave={save}
        onCancel={() => navigate('/appointments')}
      />
    </section>
  );
}
