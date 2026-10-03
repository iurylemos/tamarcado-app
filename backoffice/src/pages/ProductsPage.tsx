import { useState } from 'react';
import type { ProductRecord } from '../interfaces/admin.interface';
import { ProductEditor } from '../components/organisms/ProductEditor/ProductEditor';

interface ProductsPageProps {
  products: ProductRecord[];
  onSaved: () => Promise<void>;
}

const money = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

export function ProductsPage({ products, onSaved }: ProductsPageProps) {
  const [selected, setSelected] = useState<ProductRecord | undefined>();
  const [editorOpen, setEditorOpen] = useState(false);
  const activeCount = products.filter((product) => product.active).length;

  return (
    <section>
      <header className="page-heading">
        <div>
          <p className="eyebrow">CATÁLOGO</p>
          <h1>Seus serviços</h1>
          <p className="muted">
            Organize o que sua empresa oferece e mantenha os preços atualizados.
          </p>
        </div>
        <button
          className="button primary"
          onClick={() => {
            setSelected(undefined);
            setEditorOpen(true);
          }}
        >
          <span aria-hidden="true">＋</span> Novo serviço
        </button>
      </header>
      <div className="stat-row">
        <article className="stat-card">
          <span>Serviços cadastrados</span>
          <strong>{products.length}</strong>
          <small>no catálogo da empresa</small>
        </article>
        <article className="stat-card">
          <span>Visíveis para clientes</span>
          <strong>{activeCount}</strong>
          <small>serviços ativos</small>
        </article>
        <article className="stat-card">
          <span>Inativos</span>
          <strong>{products.length - activeCount}</strong>
          <small>não aparecem na agenda pública</small>
        </article>
      </div>
      {products.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">◇</span>
          <h2>Seu catálogo começa aqui</h2>
          <p>Cadastre o primeiro serviço para apresentá-lo aos clientes.</p>
          <button className="button primary" onClick={() => setEditorOpen(true)}>
            Adicionar serviço
          </button>
        </div>
      ) : (
        <div className="product-grid">
          {products.map((product) => (
            <article className="product-card" key={product.id}>
              <div className="product-image">
                <img src={product.imageUrl} alt="" />
                <span className={`status-pill ${product.active ? 'positive' : 'neutral'}`}>
                  {product.active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <div className="product-body">
                <div className="card-title-row">
                  <h2>{product.name}</h2>
                  <button
                    className="icon-button small"
                    aria-label={`Editar ${product.name}`}
                    onClick={() => {
                      setSelected(product);
                      setEditorOpen(true);
                    }}
                  >
                    ✎
                  </button>
                </div>
                <p className="product-description">
                  {product.description || 'Sem descrição cadastrada.'}
                </p>
                <div className="product-details">
                  <strong>{money(product.priceCents)}</strong>
                  <span>{product.durationMinutes} min</span>
                </div>
                <div className="product-footer">
                  <span>Comissão</span>
                  <strong>
                    {product.commissionType === 'percentage'
                      ? `${(product.commissionValue / 100).toLocaleString('pt-BR')}%`
                      : money(product.commissionValue)}
                  </strong>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {editorOpen && (
        <ProductEditor product={selected} onClose={() => setEditorOpen(false)} onSaved={onSaved} />
      )}
    </section>
  );
}
