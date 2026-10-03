import { useState, type JSX, type SubmitEvent } from 'react';
import type { BlockedPeriodRecord, ProfessionalRecord } from '../../../interfaces/admin.interface';
import {
  deleteBlockedPeriod,
  errorMessage,
  saveBlockedPeriod,
} from '../../../services/admin.service';
import { DateUtil } from '../../../utils/date.util';

type BlockedPeriodEditorProps = {
  professionals: ProfessionalRecord[];
  blockedPeriods: BlockedPeriodRecord[];
  timezone: string;
  onSaved: () => Promise<void>;
};

export default function BlockedPeriodEditor({
  professionals,
  blockedPeriods,
  timezone,
  onSaved,
}: BlockedPeriodEditorProps): JSX.Element {
  const [professionalId, setProfessionalId] = useState<string>('');
  const [startsAt, setStartsAt] = useState(() => DateUtil.initialLocalDateTime(1, 13, timezone));
  const [endsAt, setEndsAt] = useState(() => DateUtil.initialLocalDateTime(1, 14, timezone));
  const [reason, setReason] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const submit = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      await saveBlockedPeriod({
        ...(professionalId ? { professionalId } : {}),
        reason,
        startsAt: DateUtil.toUtc(startsAt, timezone),
        endsAt: DateUtil.toUtc(endsAt, timezone),
      });

      await onSaved();

      setReason('');
    } catch (error: unknown) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string): Promise<void> => {
    setError('');
    try {
      await deleteBlockedPeriod(id);
      await onSaved();
    } catch (error: unknown) {
      setError(errorMessage(error));
    }
  };

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
