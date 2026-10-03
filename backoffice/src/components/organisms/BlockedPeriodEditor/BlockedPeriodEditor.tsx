import { useState } from 'react';
import { getZonedDateTimeParts, localDateTimeToUtc } from '@shared/timezone';
import type { BlockedPeriodRecord, ProfessionalRecord } from '../../../interfaces/admin.interface';
import {
  deleteBlockedPeriod,
  errorMessage,
  saveBlockedPeriod,
} from '../../../services/admin.service';

interface BlockedPeriodEditorProps {
  professionals: ProfessionalRecord[];
  blockedPeriods: BlockedPeriodRecord[];
  timezone: string;
  onSaved: () => Promise<void>;
}

function formatDateTimeInput(date: Date, timezone: string): string {
  const parts = getZonedDateTimeParts(date, timezone);
  return `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}T${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`;
}

function initialLocalDateTime(offsetDays: number, hour: number, timezone: string): string {
  const now = getZonedDateTimeParts(new Date(), timezone);
  const date = new Date(Date.UTC(now.year, now.month - 1, now.day + offsetDays, hour));
  const localDate = `${String(date.getUTCFullYear()).padStart(4, '0')}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  const localTime = `${String(hour).padStart(2, '0')}:00`;
  return formatDateTimeInput(localDateTimeToUtc(localDate, localTime, timezone), timezone);
}

function toUtc(value: string, timezone: string): string {
  const [date, time] = value.split('T');
  if (!date || !time) throw new Error('Informe uma data e hora completas.');
  return localDateTimeToUtc(date, time, timezone).toISOString();
}

export function BlockedPeriodEditor({
  professionals,
  blockedPeriods,
  timezone,
  onSaved,
}: BlockedPeriodEditorProps) {
  const [professionalId, setProfessionalId] = useState('');
  const [startsAt, setStartsAt] = useState(() => initialLocalDateTime(1, 13, timezone));
  const [endsAt, setEndsAt] = useState(() => initialLocalDateTime(1, 14, timezone));
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await saveBlockedPeriod({
        ...(professionalId ? { professionalId } : {}),
        reason,
        startsAt: toUtc(startsAt, timezone),
        endsAt: toUtc(endsAt, timezone),
      });
      await onSaved();
      setReason('');
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setError('');
    try {
      await deleteBlockedPeriod(id);
      await onSaved();
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  return (
    <section className="content-card">
      <header className="section-heading">
        <div>
          <p className="eyebrow">DISPONIBILIDADE</p>
          <h2>Bloqueios pontuais</h2>
          <p className="muted">Reserve períodos em que a empresa ou uma pessoa não atende.</p>
        </div>
      </header>
      <form className="form-stack" onSubmit={(event) => void submit(event)}>
        <label>
          Aplicar bloqueio a
          <select
            value={professionalId}
            onChange={(event) => setProfessionalId(event.target.value)}
          >
            <option value="">Toda a empresa</option>
            {professionals
              .filter((professional) => professional.active)
              .map((professional) => (
                <option value={professional.id} key={professional.id}>
                  {professional.name}
                </option>
              ))}
          </select>
        </label>
        <div className="form-grid">
          <label>
            Início
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
              required
            />
          </label>
          <label>
            Fim
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
              required
            />
          </label>
        </div>
        <label>
          Motivo (opcional)
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={160}
            placeholder="Ex.: feriado, manutenção…"
          />
        </label>
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        <div>
          <button className="button secondary" disabled={busy}>
            {busy ? 'Salvando…' : 'Adicionar bloqueio'}
          </button>
        </div>
      </form>
      <div className="blocked-list">
        <h3>Períodos cadastrados</h3>
        {blockedPeriods.map((block) => (
          <article className="blocked-row" key={block.id}>
            <div>
              <strong>{block.reason || 'Bloqueio sem motivo'}</strong>
              <small>
                {new Date(block.startsAt).toLocaleString('pt-BR', { timeZone: timezone })} –{' '}
                {new Date(block.endsAt).toLocaleString('pt-BR', { timeZone: timezone })}
              </small>
            </div>
            <button className="text-button danger-text" onClick={() => void remove(block.id)}>
              Remover
            </button>
          </article>
        ))}
        {!blockedPeriods.length && <p className="muted">Nenhum bloqueio pontual cadastrado.</p>}
      </div>
    </section>
  );
}
