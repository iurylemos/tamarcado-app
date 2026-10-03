import { useState, type JSX } from 'react';
import type {
  AssignmentRecord,
  ProductRecord,
  ProfessionalRecord,
} from '../interfaces/admin.interface';
import ProfessionalEditor from '../components/organisms/ProfessionalEditor/ProfessionalEditor';

type ProfessionalsPageProps = {
  professionals: ProfessionalRecord[];
  products: ProductRecord[];
  assignments: AssignmentRecord[];
  onSaved: () => Promise<void>;
};

export default function ProfessionalsPage({
  professionals,
  products,
  assignments,
  onSaved,
}: Readonly<ProfessionalsPageProps>): JSX.Element {
  const [selected, setSelected] = useState<ProfessionalRecord | undefined>();
  const [editorOpen, setEditorOpen] = useState<boolean>(false);

  const activeCount = professionals.filter((professional) => professional.active).length;

  const assignedIds = (professionalId: string): string[] => {
    return assignments
      .filter((assignment) => assignment.professionalId === professionalId && assignment.active)
      .map((assignment) => assignment.productId);
  };

  return (
    <section>
      <header className="page-heading">
        <div>
          <p className="eyebrow">EQUIPE</p>
          <h1>Seus colaboradores</h1>
          <p className="muted">Gerencie os perfis e os serviços realizados por cada pessoa.</p>
        </div>
        <button
          className="button primary"
          onClick={() => {
            setSelected(undefined);
            setEditorOpen(true);
          }}
        >
          <span aria-hidden="true">＋</span> Adicionar pessoa
        </button>
      </header>
      <div className="stat-row">
        <article className="stat-card">
          <span>Pessoas na equipe</span>
          <strong>{professionals.length}</strong>
          <small>perfis cadastrados</small>
        </article>
        <article className="stat-card">
          <span>Disponíveis</span>
          <strong>{activeCount}</strong>
          <small>podem receber agendamentos</small>
        </article>
        <article className="stat-card">
          <span>Serviços no catálogo</span>
          <strong>{products.filter((product) => product.active).length}</strong>
          <small>serviços ativos</small>
        </article>
      </div>
      {professionals.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">♙</span>
          <h2>Monte sua equipe</h2>
          <p>Adicione colaboradores e defina quais serviços cada pessoa realiza.</p>
          <button className="button primary" onClick={() => setEditorOpen(true)}>
            Adicionar colaborador
          </button>
        </div>
      ) : (
        <div className="professional-list">
          {professionals.map((professional) => {
            const assigned = products.filter((product) =>
              assignedIds(professional.id).includes(product.id),
            );
            return (
              <article className="professional-card" key={professional.id}>
                <div className="professional-identity">
                  {professional.photoUrl ? (
                    <img className="person-avatar" src={professional.photoUrl} alt="" />
                  ) : (
                    <span className="person-avatar initials">
                      {professional.name
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join('')
                        .toUpperCase()}
                    </span>
                  )}
                  <div>
                    <h2>{professional.name}</h2>
                    <span>{professional.phoneE164}</span>
                  </div>
                </div>
                <div className="professional-services">
                  <small>SERVIÇOS</small>
                  <div className="chip-list">
                    {assigned.length ? (
                      assigned.map((product) => (
                        <span className="service-chip" key={product.id}>
                          {product.name}
                        </span>
                      ))
                    ) : (
                      <span className="muted">Nenhum serviço associado</span>
                    )}
                  </div>
                </div>
                <div className="professional-actions">
                  <span className={`status-pill ${professional.active ? 'positive' : 'neutral'}`}>
                    {professional.active ? 'Ativo' : 'Inativo'}
                  </span>
                  <button
                    className="button secondary compact"
                    onClick={() => {
                      setSelected(professional);
                      setEditorOpen(true);
                    }}
                  >
                    Editar perfil
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {editorOpen && (
        <ProfessionalEditor
          professional={selected}
          products={products}
          assignedProductIds={selected ? assignedIds(selected.id) : []}
          onClose={() => setEditorOpen(false)}
          onSaved={onSaved}
        />
      )}
    </section>
  );
}
