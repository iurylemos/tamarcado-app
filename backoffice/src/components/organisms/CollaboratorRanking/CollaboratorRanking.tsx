import type { JSX } from 'react';
import { getTopCollaborators, type SalesBreakdown } from '@shared/reporting';
import { CurrencyUtil } from '../../../utils/currency.util';

type CollaboratorRankingProps = {
  collaborators: readonly SalesBreakdown[];
};

export default function CollaboratorRanking({
  collaborators,
}: CollaboratorRankingProps): JSX.Element {
  const topCollaborators = getTopCollaborators(collaborators);

  return (
    <section className="panel ranking-panel" aria-labelledby="ranking-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">DESEMPENHO</p>
          <h2 id="ranking-title">Top colaboradores</h2>
        </div>
      </div>
      {topCollaborators.length < 3 ? (
        <p className="muted">Ranking disponível após três colaboradores com vendas.</p>
      ) : (
        <ol className="ranking-list">
          {topCollaborators.map((item, index) => (
            <li key={item.professionalId}>
              <span className="ranking-position">{index + 1}</span>
              <strong>{item.professionalName}</strong>
              <span>{CurrencyUtil.formatMoney(item.salesCents)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
