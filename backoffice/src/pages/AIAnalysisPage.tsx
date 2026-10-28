import { useMemo, useRef, useState, type JSX, type SubmitEvent } from 'react';
import { DateUtil } from '../utils/date.util';
import {
  errorMessage,
  startAnalysis,
  type StartAnalysisResponse,
} from '../services/ai-analysis.service';

type AIAnalysisPageProps = {
  timezone: string;
};

export default function AIAnalysisPage({ timezone }: Readonly<AIAnalysisPageProps>): JSX.Element {
  const initial = DateUtil.defaultPeriod(timezone);
  const [goal, setGoal] = useState<string>('');
  const [start, setStart] = useState<string>(initial.start);
  const [end, setEnd] = useState<string>(initial.end);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [result, setResult] = useState<StartAnalysisResponse | null>(null);
  const pendingKey = useRef<{ signature: string; key: string } | null>(null);
  const memoGoal = useMemo(() => ({ min: 10, max: 500 }), []);

  const submit = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError('');
    setResult(null);

    const trimmedGoal = goal.trim();

    if (trimmedGoal.length < memoGoal.min) {
      setError(`Descreva o objetivo com pelo menos ${memoGoal.min} caracteres.`);
      return;
    }

    if (end <= start) {
      setError('O fim do período deve ser depois do início.');
      return;
    }

    const signature = JSON.stringify([trimmedGoal, start, end]);
    if (pendingKey.current?.signature !== signature) {
      pendingKey.current = { signature, key: crypto.randomUUID() };
    }

    setSubmitting(true);

    try {
      const response = await startAnalysis({
        idempotencyKey: pendingKey.current.key,
        goal: trimmedGoal,
        period: { start, endExclusive: end },
      });
      pendingKey.current = null;
      setResult(response);
    } catch (reason: unknown) {
      setError(errorMessage(reason));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section>
      <header className="page-heading">
        <div>
          <p className="eyebrow">INTELIGÊNCIA</p>
          <h1>Análise com IA</h1>
          <p className="muted">
            Solicite uma análise do seu negócio. Apenas dados agregados da sua empresa são
            considerados.
          </p>
        </div>
      </header>

      <form className="panel report-filter-panel" onSubmit={(event) => void submit(event)}>
        <label>
          Objetivo da análise
          <textarea
            required
            minLength={memoGoal.min}
            maxLength={memoGoal.max}
            rows={3}
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
          />
        </label>
        <label>
          Início do período
          <input type="date" required value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label>
          Fim do período (não inclusivo)
          <input type="date" required value={end} onChange={(e) => setEnd(e.target.value)} />
        </label>
        <button className="button primary" type="submit" disabled={submitting}>
          {submitting ? 'Enviando…' : 'Solicitar análise'}
        </button>
      </form>

      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {result && (
        <p className="notice success" role="status">
          Análise solicitada. Estado: <strong>Na fila</strong> ({result.status}). Código:{' '}
          {result.executionId}
        </p>
      )}
    </section>
  );
}
