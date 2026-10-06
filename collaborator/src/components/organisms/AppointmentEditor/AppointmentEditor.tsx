import { useState, type JSX, type SubmitEvent } from 'react';
import { getZonedDateTimeParts } from '@shared/timezone';
import type {
  CollaboratorAppointment,
  EligibleProfessional,
} from '../../../interfaces/appointment.interface';

type AppointmentEditorProps = {
  appointment: CollaboratorAppointment;
  professionals: EligibleProfessional[];
  timezone: string;
  saving: boolean;
  onSave: (startsAt: string, professionalId: string) => Promise<void>;
  onCancel: () => void;
};

export default function AppointmentEditor({
  appointment,
  professionals,
  timezone,
  saving,
  onSave,
  onCancel,
}: Readonly<AppointmentEditorProps>): JSX.Element {
  const local = getZonedDateTimeParts(appointment.startsAt, timezone);
  const [date, setDate] = useState<string>(
    `${local.year}-${String(local.month).padStart(2, '0')}-${String(local.day).padStart(2, '0')}`,
  );
  const [time, setTime] = useState<string>(
    `${String(local.hour).padStart(2, '0')}:${String(local.minute).padStart(2, '0')}`,
  );
  const [professionalId, setProfessionalId] = useState<string>(appointment.professionalId);

  const submit = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    await onSave(`${date}T${time}`, professionalId);
  };

  return (
    <form className="panel editor-form" onSubmit={submit}>
      <div>
        <p className="eyebrow">Editar agendamento</p>
        <h1>{appointment.customerName || 'Cliente'}</h1>
        <p className="muted">{appointment.productNameSnapshot}</p>
      </div>
      <label>
        Data
        <input
          type="date"
          required
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
      </label>
      <label>
        Horário
        <input
          type="time"
          required
          value={time}
          onChange={(event) => setTime(event.target.value)}
        />
      </label>
      <label>
        Profissional
        <select value={professionalId} onChange={(event) => setProfessionalId(event.target.value)}>
          {professionals.map((professional) => (
            <option key={professional.id} value={professional.id}>
              {professional.name}
            </option>
          ))}
        </select>
      </label>
      <p className="muted">O horário será validado novamente com a disponibilidade da empresa.</p>
      <div className="form-actions">
        <button type="submit" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar alteração'}
        </button>
        <button type="button" className="button button--secondary" onClick={onCancel}>
          Voltar
        </button>
      </div>
    </form>
  );
}
