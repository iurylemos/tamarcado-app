import { useState, type JSX, type SubmitEvent } from 'react';
import type {
  ProfessionalRecord,
  WorkingHoursRecord,
  BlockedPeriodRecord,
} from '../interfaces/admin.interface';
import { errorMessage, saveWorkingHours } from '../services/admin.service';
import BlockedPeriodEditor from '../components/organisms/BlockedPeriodEditor/BlockedPeriodEditor';
import { DateUtil } from '../utils/date.util';

type AvailabilityPageProps = {
  professionals: ProfessionalRecord[];
  workingHours: WorkingHoursRecord[];
  blockedPeriods: BlockedPeriodRecord[];
  bookingIntervalMinutes: number;
  timezone: string;
  onSaved: () => Promise<void>;
};

export default function AvailabilityPage({
  professionals,
  workingHours,
  blockedPeriods,
  bookingIntervalMinutes,
  timezone,
  onSaved,
}: AvailabilityPageProps): JSX.Element {
  const [professionalId, setProfessionalId] = useState(professionals[0]?.id ?? '');
  const [editing, setEditing] = useState<WorkingHoursRecord | undefined>();
  const [dayOfWeek, setDayOfWeek] = useState<string>('1');
  const [startLocalTime, setStartLocalTime] = useState<string>('09:00');
  const [endLocalTime, setEndLocalTime] = useState<string>('18:00');
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const selectedProfessional = professionals.find(
    (professional) => professional.id === professionalId,
  );

  const selectedHours = workingHours
    .filter((hours) => hours.professionalId === professionalId)
    .sort(
      (first, second) =>
        first.dayOfWeek - second.dayOfWeek ||
        first.startLocalTime.localeCompare(second.startLocalTime),
    );

  const startEdit = (hours: WorkingHoursRecord): void => {
    setEditing(hours);
    setProfessionalId(hours.professionalId);
    setDayOfWeek(String(hours.dayOfWeek));
    setStartLocalTime(hours.startLocalTime);
    setEndLocalTime(hours.endLocalTime);
  };

  const clearEditor = (): void => {
    setEditing(undefined);
    setDayOfWeek('1');
    setStartLocalTime('09:00');
    setEndLocalTime('18:00');
    setError('');
  };

  const submit = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (!professionalId) {
      setError('Cadastre um colaborador antes de configurar a agenda.');
      return;
    }

    setBusy(true);
    setError('');

    try {
      await saveWorkingHours({
        ...(editing ? { id: editing.id } : {}),
        professionalId,
        dayOfWeek: Number(dayOfWeek),
        startLocalTime,
        endLocalTime,
        active: editing?.active ?? true,
      });
      await onSaved();
      clearEditor();
    } catch (error: unknown) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (hours: WorkingHoursRecord): Promise<void> => {
    setError('');
    try {
      await saveWorkingHours({ ...hours, active: !hours.active });
      await onSaved();
    } catch (error: unknown) {
      setError(errorMessage(error));
    }
  };

  return (
    <section>
      <header className="page-heading">
        <div>
          <p className="eyebrow">AGENDA</p>
          <h1>Horários e disponibilidade</h1>
          <p className="muted">Configure os horários semanais e os períodos sem atendimento.</p>
        </div>
        <span className="timezone-badge">Fuso da empresa · {timezone}</span>
      </header>
      <div className="availability-layout">
        <section className="content-card">
          <header className="section-heading">
            <div>
              <p className="eyebrow">HORÁRIO SEMANAL</p>
              <h2>Expediente da equipe</h2>
            </div>
            <label className="compact-label">
              Colaborador
              <select
                value={professionalId}
                onChange={(event) => {
                  setProfessionalId(event.target.value);
                  clearEditor();
                }}
              >
                {professionals.map((professional) => (
                  <option value={professional.id} key={professional.id}>
                    {professional.name}
                  </option>
                ))}
              </select>
            </label>
          </header>
          {!professionals.length ? (
            <div className="inline-empty">
              <strong>Não há colaboradores cadastrados.</strong>
              <span>Adicione pessoas à equipe para configurar a agenda.</span>
            </div>
          ) : (
            <>
              <div className="hours-list">
                {selectedHours.map((hours) => (
                  <article
                    className={`hours-row ${hours.active ? '' : 'inactive-row'}`}
                    key={hours.id}
                  >
                    <span className="day-badge">
                      {DateUtil.weekdays[hours.dayOfWeek - 1]?.short}
                    </span>
                    <span className="hours-time">
                      {hours.startLocalTime} <span>até</span> {hours.endLocalTime}
                    </span>
                    <span className={`status-pill ${hours.active ? 'positive' : 'neutral'}`}>
                      {hours.active ? 'Ativo' : 'Inativo'}
                    </span>
                    <button className="text-button" onClick={() => startEdit(hours)}>
                      Editar
                    </button>
                    <button className="text-button" onClick={() => void toggleActive(hours)}>
                      {hours.active ? 'Desativar' : 'Ativar'}
                    </button>
                  </article>
                ))}
                {!selectedHours.length && (
                  <div className="inline-empty">
                    <strong>Nenhum horário configurado.</strong>
                    <span>Adicione os dias e intervalos de atendimento.</span>
                  </div>
                )}
              </div>
              <form className="schedule-form" onSubmit={(event) => void submit(event)}>
                <h3>{editing ? 'Editar intervalo' : 'Adicionar intervalo'}</h3>
                <label>
                  Dia da semana
                  <select value={dayOfWeek} onChange={(event) => setDayOfWeek(event.target.value)}>
                    {DateUtil.weekdays.map((day) => (
                      <option value={day.value} key={day.value}>
                        {day.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="form-grid">
                  <label>
                    Abre às
                    <input
                      type="time"
                      value={startLocalTime}
                      onChange={(event) => setStartLocalTime(event.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Fecha às
                    <input
                      type="time"
                      value={endLocalTime}
                      onChange={(event) => setEndLocalTime(event.target.value)}
                      required
                    />
                  </label>
                </div>
                {error && (
                  <p className="notice error" role="alert">
                    {error}
                  </p>
                )}
                <div className="editor-actions">
                  {editing && (
                    <button type="button" className="button secondary" onClick={clearEditor}>
                      Cancelar edição
                    </button>
                  )}
                  <button className="button primary" disabled={busy}>
                    {busy ? 'Salvando…' : editing ? 'Salvar horário' : 'Adicionar horário'}
                  </button>
                </div>
              </form>
            </>
          )}
          {selectedProfessional && (
            <p className="helper-text">
              Os horários são interpretados no fuso configurado em {selectedProfessional.name}.
            </p>
          )}
        </section>
        <div className="availability-side">
          <article className="info-card">
            <span className="info-icon">◷</span>
            <h3>Intervalo entre horários</h3>
            <p>
              Os novos horários seguem o intervalo de{' '}
              <strong>{bookingIntervalMinutes} minutos</strong> configurado pela empresa. A duração
              do serviço também é considerada.
            </p>
          </article>
          <div className="blocked-count">
            <span>Bloqueios pontuais</span>
            <strong>{blockedPeriods.length}</strong>
            <small>períodos sem atendimento</small>
          </div>
          {selectedProfessional && (
            <p className="sr-only">Agenda selecionada para {selectedProfessional.name}</p>
          )}
        </div>
      </div>
      <div className="blocked-section">
        <BlockedPeriodEditor
          professionals={professionals}
          blockedPeriods={blockedPeriods}
          timezone={timezone}
          onSaved={onSaved}
        />
      </div>
    </section>
  );
}
