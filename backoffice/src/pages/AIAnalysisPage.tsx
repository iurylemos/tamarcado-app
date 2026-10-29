import { useEffect, useMemo, useRef, useState, type JSX, type SubmitEvent } from 'react';
import type {
  AnalysisGoal,
  AnalysisKey,
  AnalysisValue,
  StartAnalysisResponse,
} from '../interfaces/analysis.interface';
import { MarkdownUtil } from '../utils/markdown.util';
import { DateUtil } from '../utils/date.util';
import { errorMessage, getAnalysisReport, startAnalysis } from '../services/ai-analysis.service';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
  const [copied, setCopied] = useState<boolean>(false);
  const [result, setResult] = useState<StartAnalysisResponse | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisValue | null>(null);
  const pendingKey = useRef<AnalysisKey | null>(null);
  const memoGoal = useMemo<AnalysisGoal>(() => ({ min: 10, max: 500 }), []);

  const markdown = useMemo(
    () => (analysis ? MarkdownUtil.buildAnalysisMarkdown(analysis) : ''),
    [analysis],
  );

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

  const copyMarkdown = async (text: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
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

      <div className="flex flex-col gap-2.5 mb-4">
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
      </div>

      {analysis && (
        <article className="ai-response" aria-labelledby="analysis-report-title">
          <header className="ai-response__header">
            <div className="ai-response__avatar" aria-hidden="true">
              AI
            </div>

            <div className="ai-response__identity">
              <h2 id="analysis-report-title">Análise do Tá Marcado</h2>
              <p>Relatório gerado por inteligência artificial</p>
            </div>

            <button
              type="button"
              className="ai-response__copy"
              onClick={() => void copyMarkdown(markdown)}
              aria-label="Copiar relatório completo em Markdown"
            >
              {copied ? '✓ Copiado' : '▢ Copiar relatório'}
            </button>
          </header>

          <div className="ai-response__content">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
              }}
            >
              {markdown}
            </ReactMarkdown>
          </div>

          <footer className="ai-response__footer">
            <span>Conteúdo gerado por IA. Confira as evidências antes de tomar decisões.</span>

            <button
              type="button"
              className="ai-response__copy"
              onClick={() => void copyMarkdown(markdown)}
            >
              Copiar relatório
            </button>
          </footer>
        </article>
      )}
    </section>
  );
}
