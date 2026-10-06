import type { JSX } from 'react';
import type { SalesReport } from '@shared/reporting';
import { formatBrl } from '@shared/money';

type MonthlyCommissionReportProps = {
  report: SalesReport;
};

export default function MonthlyCommissionReport({
  report,
}: Readonly<MonthlyCommissionReportProps>): JSX.Element {
  return (
    <>
      <section className="report-summary" aria-label="Resumo mensal">
        <article className="panel report-metric">
          <span>Vendas no mês</span>
          <strong>{formatBrl(report.totalSalesCents)}</strong>
          <small>{report.appointmentCount} atendimentos concluídos</small>
        </article>
        <article className="panel report-metric">
          <span>Minha comissão</span>
          <strong>{formatBrl(report.totalCommissionCents)}</strong>
          <small>
            {new Intl.DateTimeFormat('pt-BR', {
              month: 'long',
              year: 'numeric',
              timeZone: 'UTC',
            }).format(new Date(Date.UTC(report.year, report.month - 1, 1)))}
          </small>
        </article>
      </section>

      {report.appointmentCount === 0 ? (
        <section className="empty-state">
          <h2>Nenhuma venda concluída neste período.</h2>
          <p>Quando houver atendimentos concluídos, os valores aparecerão aqui.</p>
        </section>
      ) : (
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
                {report.products.map((product) => (
                  <tr key={product.productId}>
                    <th scope="row">{product.productName}</th>
                    <td>{product.appointmentCount}</td>
                    <td>{formatBrl(product.salesCents)}</td>
                    <td>{formatBrl(product.commissionCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
