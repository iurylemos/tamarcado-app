import { useCallback, useEffect, useState, type JSX, type SubmitEvent } from 'react';
import { getZonedDateTimeParts } from '@shared/timezone';
import type { SalesReport } from '@shared/reporting';
import { CurrencyUtil } from '../utils/currency.util';
import type { ProductRecord, ProfessionalRecord } from '../interfaces/admin.interface';
import {
  errorMessage,
  exportSalesReport,
  getSalesReport,
  rebuildMonthlyReport,
} from '../services/report.service';
import CollaboratorRanking from '../components/organisms/CollaboratorRanking/CollaboratorRanking';
import { DateUtil } from '../utils/date.util';

type ReportsPageProps = {
  timezone: string;
  products: ProductRecord[];
  professionals: ProfessionalRecord[];
};

export default function ReportsPage({
  timezone,
  products,
  professionals,
}: ReportsPageProps): JSX.Element {
  const currentPeriod = getZonedDateTimeParts(new Date(), timezone);
  const currentYear = currentPeriod.year;
  const currentMonth = currentPeriod.month;
  const [month, setMonth] = useState<string>(DateUtil.monthValue(currentYear, currentMonth));
  const [productId, setProductId] = useState<string>('');
  const [professionalId, setProfessionalId] = useState<string>('');
  const [report, setReport] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const [rebuilding, setRebuilding] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [notice, setNotice] = useState<string>('');

  const filters = useCallback(
    () => DateUtil.filtersFromValues(month, productId, professionalId),
    [month, productId, professionalId],
  );

  useEffect(() => {
    let active = true;
    setLoading(true);

    void getSalesReport({
      year: currentYear,
      month: currentMonth,
    })
      .then((result) => {
        if (active) setReport(result);
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
  }, [currentYear, currentMonth]);

  const applyFilters = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');

    try {
      const request = filters();
      setReport(await getSalesReport(request));
    } catch (reason: unknown) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (): Promise<void> => {
    setExporting(true);
    setError('');
    setNotice('');

    try {
      const request = filters();
      const matchingReport = await getSalesReport(request);
      setReport(matchingReport);
      await exportSalesReport(request);
      setNotice('Arquivo CSV exportado com os mesmos filtros do relatório.');
    } catch (reason: unknown) {
      setError(errorMessage(reason));
    } finally {
      setExporting(false);
    }
  };

  const handleRebuild = async (): Promise<void> => {
    setRebuilding(true);
    setError('');
    setNotice('');

    try {
      const request = filters();
      if (request.productId || request.professionalId) {
        throw new Error('Remova os filtros de colaborador e serviço antes de reconstruir o mês.');
      }
      const result = await rebuildMonthlyReport({ year: request.year, month: request.month });
      setNotice(`Projeção mensal reconstruída (${result.written} dimensões).`);
    } catch (reason: unknown) {
      setError(errorMessage(reason));
    } finally {
      setRebuilding(false);
    }
  };

  return (
    <section>
      <header className="page-heading">
        <div>
          <p className="eyebrow">FINANCEIRO</p>
          <h1>Relatórios de vendas</h1>
          <p className="muted">Valores calculados a partir de atendimentos concluídos.</p>
        </div>
      </header>

      <form className="panel report-filter-panel" onSubmit={applyFilters}>
        <label>
          Período
          <input
            aria-label="Período"
            type="month"
            required
            value={month}
            onChange={(event) => setMonth(event.target.value)}
          />
        </label>
        <label>
          Serviço
          <select
            aria-label="Serviço"
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
          >
            <option value="">Todos os serviços</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Colaborador
          <select
            aria-label="Colaborador"
            value={professionalId}
            onChange={(event) => setProfessionalId(event.target.value)}
          >
            <option value="">Todos os colaboradores</option>
            {professionals.map((professional) => (
              <option key={professional.id} value={professional.id}>
                {professional.name}
              </option>
            ))}
          </select>
        </label>
        <button className="button primary" type="submit" disabled={loading}>
          Aplicar filtros
        </button>
        <button
          className="button secondary"
          type="button"
          disabled={exporting}
          onClick={() => void handleExport()}
        >
          {exporting ? 'Exportando…' : 'Exportar CSV'}
        </button>
        <button
          className="button secondary"
          type="button"
          disabled={rebuilding}
          onClick={() => void handleRebuild()}
        >
          {rebuilding ? 'Reconstruindo…' : 'Reconstruir projeção'}
        </button>
      </form>

      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="notice success" role="status">
          {notice}
        </p>
      )}
      {loading ? (
        <p role="status">Carregando relatório…</p>
      ) : report ? (
        <>
          <div className="stat-row">
            <article className="stat-card">
              <span>Vendas no período</span>
              <strong>{CurrencyUtil.formatMoney(report.totalSalesCents)}</strong>
              <small>{report.appointmentCount} atendimentos concluídos</small>
            </article>
            <article className="stat-card">
              <span>Comissões</span>
              <strong>{CurrencyUtil.formatMoney(report.totalCommissionCents)}</strong>
              <small>valores conforme os registros de cada atendimento</small>
            </article>
            <article className="stat-card">
              <span>Serviços vendidos</span>
              <strong>{report.products.length}</strong>
              <small>no período e filtros selecionados</small>
            </article>
          </div>

          {report.appointmentCount === 0 ? (
            <section className="empty-state">
              <h2>Nenhuma venda concluída neste período.</h2>
              <p>Altere o período ou remova filtros para consultar outros resultados.</p>
            </section>
          ) : (
            <>
              <div className="dashboard-report-grid">
                <CollaboratorRanking collaborators={report.collaborators} />
                <section className="panel report-table-panel">
                  <h2>Vendas por serviço</h2>
                  <div className="report-table-wrap">
                    <table className="report-table">
                      <thead>
                        <tr>
                          <th>Serviço</th>
                          <th>Atendimentos</th>
                          <th>Vendas</th>
                          <th>Comissão</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.products.map((item) => (
                          <tr key={item.productId}>
                            <th scope="row">{item.productName}</th>
                            <td>{item.appointmentCount}</td>
                            <td>{CurrencyUtil.formatMoney(item.salesCents)}</td>
                            <td>{CurrencyUtil.formatMoney(item.commissionCents)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
              <section className="panel report-table-panel">
                <h2>Vendas por colaborador</h2>
                <div className="report-table-wrap">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Colaborador</th>
                        <th>Atendimentos</th>
                        <th>Vendas</th>
                        <th>Comissão</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.collaborators.map((item) => (
                        <tr key={item.professionalId}>
                          <th scope="row">{item.professionalName}</th>
                          <td>{item.appointmentCount}</td>
                          <td>{CurrencyUtil.formatMoney(item.salesCents)}</td>
                          <td>{CurrencyUtil.formatMoney(item.commissionCents)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </>
      ) : (
        <section className="empty-state">
          <h2>Não foi possível carregar o relatório.</h2>
        </section>
      )}
    </section>
  );
}
