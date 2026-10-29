import { useEffect, useMemo, useRef, useState, type JSX, type SubmitEvent } from 'react';
import { DateUtil } from '../utils/date.util';
import {
  errorMessage,
  getAnalysisReport,
  startAnalysis,
  type GetAnalysisReportResponse,
  type StartAnalysisResponse,
} from '../services/ai-analysis.service';
import { MetricUtil } from '../utils/metric.util';

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
  const [analysis, setAnalysis] = useState<Extract<
    GetAnalysisReportResponse,
    { status: 'succeeded' }
  > | null>(null);
  const pendingKey = useRef<{ signature: string; key: string } | null>(null);
  const memoGoal = useMemo(() => ({ min: 10, max: 500 }), []);

  useEffect(() => {
    if (!result) return undefined;

    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async (): Promise<void> => {
      try {
        const response = await getAnalysisReport(result.executionId);

        if (!active) return;

        if (response.status === 'succeeded') {
          setAnalysis(response);
          return;
        }

        if (
          response.status === 'failed' ||
          response.status === 'timed_out' ||
          response.status === 'cancelled'
        ) {
          setError('A análise não pôde ser concluída. Tente novamente mais tarde.');
          return;
        }

        timer = setTimeout(() => void poll(), 3000);
      } catch (reason: unknown) {
        if (active) setError(errorMessage(reason));
      }
    };

    timer = setTimeout(() => void poll(), 3000);

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [result]);

  const submit = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError('');
    setResult(null);
    setAnalysis(null);

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
          {analysis
            ? 'Análise concluída.'
            : 'Análise solicitada. Estado inicial: Na fila. Estamos preparando o relatório.'}{' '}
          Código: {result.executionId}
        </p>
      )}

      {result && !analysis && !error && (
        <p aria-live="polite">Aguardando a conclusão da análise…</p>
      )}

      {analysis && (
        <article className="panel" aria-labelledby="analysis-report-title">
          <h2 id="analysis-report-title">Relatório da análise</h2>
          <p>{analysis.report.summary}</p>

          <h3>Métricas do período</h3>
          <p>
            Agendamentos: <strong>{analysis.metrics.appointmentCount}</strong>
            {analysis.metrics.coverage === 'no_data' && ' — sem dados no período.'}
          </p>
          <ul>
            <li>
              Vendas concluídas:{' '}
              {MetricUtil.formatMetricCurrency(analysis.metrics.completedSalesCents)}
            </li>
            <li>
              Comissões concluídas:{' '}
              {MetricUtil.formatMetricCurrency(analysis.metrics.completedCommissionCents)}
            </li>
            <li>Métricas de ocupação: {MetricUtil.formatMetric(analysis.metrics.occupancy)}</li>
            <li>
              Comparação entre períodos:{' '}
              {MetricUtil.formatMetric(analysis.metrics.periodComparison)}
            </li>
          </ul>

          {analysis.report.facts.length > 0 && (
            <>
              <h3>Fatos e evidências</h3>
              <ul>
                {analysis.report.facts.map((fact) => (
                  <li key={fact.id}>
                    {fact.statement}{' '}
                    <small>
                      ({fact.source.type}: {fact.source.reference})
                    </small>
                  </li>
                ))}
              </ul>
            </>
          )}

          {analysis.report.inferences.length > 0 && (
            <>
              <h3>Inferências e incertezas</h3>
              <ul>
                {analysis.report.inferences.map((inference) => (
                  <li key={inference.id}>
                    {inference.statement} <strong>Incerteza:</strong> {inference.uncertainty}
                  </li>
                ))}
              </ul>
            </>
          )}

          {analysis.report.recommendations.length > 0 && (
            <>
              <h3>Recomendações para avaliação</h3>
              <ul>
                {analysis.report.recommendations.map((recommendation) => (
                  <li key={recommendation.id}>
                    <strong>{recommendation.title}</strong> ({recommendation.priority}) —{' '}
                    {recommendation.rationale}
                  </li>
                ))}
              </ul>
            </>
          )}

          {analysis.report.sources.length > 0 && (
            <>
              <h3>Fontes externas</h3>
              <ul>
                {analysis.report.sources.map((source) => (
                  <li key={source.url}>
                    <a href={source.url} target="_blank" rel="noreferrer">
                      {source.title}
                    </a>
                    <p>{source.snippet}</p>
                  </li>
                ))}
              </ul>
            </>
          )}

          {analysis.report.limitations.length > 0 && (
            <>
              <h3>Limitações</h3>
              <ul>
                {analysis.report.limitations.map((limitation, index) => (
                  <li key={`${index}-${limitation}`}>{limitation}</li>
                ))}
              </ul>
            </>
          )}
        </article>
      )}
    </section>
  );
}
