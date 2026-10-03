import { useEffect, useState, type JSX } from 'react';
import type { BusinessSegment } from '@shared/interfaces/tenant.interface';
import type { CompanySummary } from '../interfaces/company.interface';
import { listPublicCompanies } from '../services/company.service';
import Card from '../components/atoms/Card';

const segmentOptions: Array<{ value: BusinessSegment; label: string }> = [
  { value: 'beauty', label: 'Beleza' },
  { value: 'health', label: 'Saúde' },
  { value: 'fitness', label: 'Bem-estar' },
  { value: 'automotive', label: 'Automotivo' },
  { value: 'other', label: 'Outros' },
];

export default function CompanyListPage(): JSX.Element {
  const [segment, setSegment] = useState<BusinessSegment | ''>('');
  const [companies, setCompanies] = useState<CompanySummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError('');

    listPublicCompanies(segment || undefined)
      .then((result) => {
        if (current) setCompanies(result);
      })
      .catch(() => {
        if (current) setError('Não foi possível carregar as empresas. Tente novamente.');
      })
      .finally(() => {
        if (current) setLoading(false);
      });

    return () => {
      current = false;
    };
  }, [segment]);

  return (
    <main className="page stack">
      <header className="stack">
        <p className="muted">Agendamentos simples, perto de você</p>
        <h1>Encontre seu próximo atendimento</h1>
        <label className="field" htmlFor="segment-filter">
          Filtrar por segmento
          <select
            id="segment-filter"
            value={segment}
            onChange={(event) => setSegment(event.target.value as BusinessSegment | '')}
          >
            <option value="">Todos os segmentos</option>
            {segmentOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </header>

      {loading && <p role="status">Carregando empresas...</p>}

      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}

      {!loading && !error && companies.length === 0 && (
        <p role="status">Nenhuma empresa encontrada neste segmento.</p>
      )}

      {!loading && !error && companies.length > 0 && (
        <section className="grid-cards" aria-label="Empresas">
          {companies.map((company) => (
            <Card
              key={company.id}
              title={company.name}
              imageUrl={company.logoUrl}
              description={company.description}
              detail={segmentOptions.find((option) => option.value === company.segment)?.label}
              href={`/empresa/${company.slug}`}
              actionLabel="Ver serviços"
            />
          ))}
        </section>
      )}
    </main>
  );
}
