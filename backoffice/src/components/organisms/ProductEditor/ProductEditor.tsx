import { useState, type JSX } from 'react';
import type { ProductRecord } from '../../../interfaces/admin.interface';
import { errorMessage, saveProduct } from '../../../services/admin.service';

type ProductEditorProps = {
  product?: ProductRecord;
  onClose: () => void;
  onSaved: () => Promise<void>;
};

export default function ProductEditor({
  product,
  onClose,
  onSaved,
}: ProductEditorProps): JSX.Element {
  const [name, setName] = useState<string>(product?.name ?? '');
  const [description, setDescription] = useState<string>(product?.description ?? '');
  const [imageUrl, setImageUrl] = useState<string>(product?.imageUrl ?? '');
  const [price, setPrice] = useState<string>(product ? (product.priceCents / 100).toFixed(2) : '');
  const [duration, setDuration] = useState<string>(String(product?.durationMinutes ?? 30));
  const [commissionType, setCommissionType] = useState<'percentage' | 'fixed'>(
    product?.commissionType ?? 'percentage',
  );
  const [commission, setCommission] = useState<string>(
    product
      ? commissionType === 'percentage'
        ? String(product.commissionValue / 100)
        : (product.commissionValue / 100).toFixed(2)
      : '35',
  );
  const [active, setActive] = useState<boolean>(product?.active ?? true);
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const submit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setBusy(true);
    setError('');
    const parsedPrice = Number(price.replace(',', '.'));
    const parsedCommission = Number(commission.replace(',', '.'));

    if (!Number.isFinite(parsedPrice) || !Number.isFinite(parsedCommission)) {
      setError('Informe valores numéricos válidos para preço e comissão.');
      setBusy(false);
      return;
    }

    try {
      await saveProduct({
        ...(product ? { id: product.id } : { id: '' }),
        name,
        description,
        imageUrl,
        priceCents: Math.round(parsedPrice * 100),
        durationMinutes: Number(duration),
        commissionType,
        commissionValue:
          commissionType === 'percentage'
            ? Math.round(parsedCommission * 100)
            : Math.round(parsedCommission * 100),
        active,
      });
      await onSaved();
      onClose();
    } catch (error: unknown) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="editor-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-editor-title"
      >
        <header className="editor-header">
          <div>
            <p className="eyebrow">CATÁLOGO DE SERVIÇOS</p>
            <h2 id="product-editor-title">{product ? 'Editar serviço' : 'Novo serviço'}</h2>
          </div>
          <button className="icon-button" aria-label="Fechar" onClick={onClose}>
            ×
          </button>
        </header>
        <form className="form-stack" onSubmit={(event) => void submit(event)}>
          <label>
            Nome do serviço
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              required
            />
          </label>
          <label>
            Descrição
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={600}
              rows={3}
            />
          </label>
          <label>
            Imagem do serviço (URL)
            <input
              type="url"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="https://…"
              required
            />
          </label>
          {imageUrl && (
            <div className="image-preview">
              <img src={imageUrl} alt="Prévia do serviço" />
              <span>Prévia da imagem</span>
            </div>
          )}
          <div className="form-grid">
            <label>
              Preço (R$)
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                required
              />
            </label>
            <label>
              Duração (minutos)
              <input
                type="number"
                min="1"
                step="1"
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
                required
              />
            </label>
          </div>
          <div className="form-grid">
            <label>
              Tipo de comissão
              <select
                value={commissionType}
                onChange={(event) => {
                  const next = event.target.value as 'percentage' | 'fixed';
                  setCommissionType(next);
                  setCommission(next === 'percentage' ? '35' : '25.00');
                }}
              >
                <option value="percentage">Percentual</option>
                <option value="fixed">Valor fixo</option>
              </select>
            </label>
            <label>
              {commissionType === 'percentage' ? 'Comissão (%)' : 'Comissão (R$)'}
              <input
                type="number"
                min="0"
                max={commissionType === 'percentage' ? 100 : undefined}
                step="0.01"
                value={commission}
                onChange={(event) => setCommission(event.target.value)}
                required
              />
            </label>
          </div>
          <label className="toggle-row">
            <span>
              <strong>Serviço ativo</strong>
              <small>Serviços ativos aparecem no catálogo público.</small>
            </span>
            <input
              type="checkbox"
              checked={active}
              onChange={(event) => setActive(event.target.checked)}
            />
          </label>
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          <footer className="editor-actions">
            <button type="button" className="button secondary" onClick={onClose}>
              Cancelar
            </button>
            <button className="button primary" disabled={busy}>
              {busy ? 'Salvando…' : product ? 'Salvar alterações' : 'Criar serviço'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
