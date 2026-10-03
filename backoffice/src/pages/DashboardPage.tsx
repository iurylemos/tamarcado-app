import { useEffect, useState, type JSX } from 'react';
import { getZonedDateTimeParts } from '@shared/timezone';
import type { SalesReport } from '@shared/reporting';
import { errorMessage, getSalesReport } from '../services/report.service';
import type { ProductRecord } from '../interfaces/admin.interface';
import CollaboratorRanking from '../components/organisms/CollaboratorRanking/CollaboratorRanking';
import { CurrencyUtil } from '../utils/currency.util';

interface DashboardPageProps {
  timezone: string;
  onOpenReports: () => void;
  products: ProductRecord[];
}

export default function DashboardPage({
  timezone,
  onOpenReports,
  products,
}: DashboardPageProps): JSX.Element {
  const [report, setReport] = useState<SalesReport | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const period = getZonedDateTimeParts(new Date(), timezone);
  const year = period.year;
  const month = period.month;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    void getSalesReport({ year, month })
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
  }, [year, month]);

  return (
    <section>
      <header className="page-heading">
        <div>
          <p className="eyebrow">VISÃO GERAL</p>
          <h1>Painel da empresa</h1>
          <p className="muted">Acompanhe as vendas concluídas neste mês.</p>
        </div>
        <button className="button primary" onClick={onOpenReports}>
          Ver relatórios
        </button>
      </header>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">Carregando indicadores…</p>
      ) : report ? (
        <>
          <div className="stat-row">
            <article className="stat-card">
              <span>Vendas no mês</span>
              <strong>{CurrencyUtil.formatMoney(report.totalSalesCents)}</strong>
              <small>{report.appointmentCount} atendimentos concluídos</small>
            </article>
            <article className="stat-card">
              <span>Comissões no mês</span>
              <strong>{CurrencyUtil.formatMoney(report.totalCommissionCents)}</strong>
              <small>calculadas pelas condições registradas no atendimento</small>
            </article>
            <article className="stat-card">
              <span>Serviços com vendas</span>
              <strong>{report.products.length}</strong>
              <small>no período selecionado</small>
            </article>
          </div>
          <div className="dashboard-report-grid">
            <CollaboratorRanking collaborators={report.collaborators} />
            <section className="panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">CATÁLOGO</p>
                  <h2>Vendas por serviço</h2>
                </div>
              </div>
              {report.appointmentCount === 0 ? (
                <p className="muted">Nenhuma venda concluída neste período.</p>
              ) : (
                <ul className="dashboard-product-list">
                  {report.products.map((product) => (
                    <li key={product.productId}>
                      <span>{product.productName}</span>
                      <strong>{CurrencyUtil.formatMoney(product.salesCents)}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      ) : (
        <section className="empty-state">
          <h2>Não foi possível carregar os indicadores.</h2>
        </section>
      )}
      {products.length === 0 && (
        <p className="muted">Cadastre serviços para habilitar filtros de produto nos relatórios.</p>
      )}
    </section>
  );
}
