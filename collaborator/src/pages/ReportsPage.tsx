import { useEffect, useState, type JSX, type SubmitEvent } from 'react';
import type { SalesReport } from '@shared/reporting';
import { getCollaboratorReport, errorMessage } from '../services/report.service';
import MonthlyCommissionReport from '../components/organisms/MonthlyCommissionReport/MonthlyCommissionReport';
import type { ReportPeriod } from '../interfaces/report.interface';
import { ReportUtil } from '../utils/report.util';

type ReportsPageProps = {
  initialPeriod?: ReportPeriod;
};

export default function ReportsPage({ initialPeriod }: ReportsPageProps): JSX.Element {
  const initialYear = initialPeriod?.year;
  const initialMonth = initialPeriod?.month;
  const [periodValue, setPeriodValue] = useState<string>(
    ReportUtil.periodInput(initialPeriod ?? ReportUtil.currentPeriod()),
  );
  const [report, setReport] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    const requestedPeriod =
      initialYear !== undefined && initialMonth !== undefined
        ? { year: initialYear, month: initialMonth }
        : {};

    void getCollaboratorReport(requestedPeriod)
      .then((result) => {
        if (!active) return;
        setReport(result);
        setPeriodValue(ReportUtil.periodInput({ year: result.year, month: result.month }));
      })
      .catch((reason: unknown) => {
        if (active) setError(errorMessage(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [initialYear, initialMonth]);

  const loadPeriod = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const period = ReportUtil.parsePeriod(periodValue);
      const result = await getCollaboratorReport(period);
      setReport(result);
      setPeriodValue(ReportUtil.periodInput({ year: result.year, month: result.month }));
    } catch (reason: unknown) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">DESEMPENHO</p>
          <h1>Meu relatório</h1>
          <p className="muted">Vendas concluídas e comissão do período selecionado.</p>
        </div>
        <form className="report-filters" onSubmit={loadPeriod}>
          <label className="date-filter">
            Mês do relatório
            <input
              aria-label="Mês do relatório"
              type="month"
              required
              value={periodValue}
              onChange={(event) => setPeriodValue(event.target.value)}
            />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? 'Atualizando…' : 'Aplicar'}
          </button>
        </form>
      </header>

      {error && (
        <p className="feedback feedback--error" role="alert">
          {error}
        </p>
      )}
      {loading && <p role="status">Carregando relatório…</p>}
      {!loading && report && <MonthlyCommissionReport report={report} />}
    </main>
  );
}
