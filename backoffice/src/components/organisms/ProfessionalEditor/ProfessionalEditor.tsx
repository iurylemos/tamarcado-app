import { useState, type JSX, type SubmitEvent } from 'react';
import type { ProfessionalRecord } from '../../../interfaces/admin.interface';
import type { ProductRecord } from '../../../interfaces/product.interface';
import {
  errorMessage,
  resetCollaboratorPassword,
  saveCollaboratorAccount,
  saveProfessional,
} from '../../../services/admin.service';

type ProfessionalEditorProps = {
  professional?: ProfessionalRecord;
  products: ProductRecord[];
  assignedProductIds: string[];
  currentEmail?: string | undefined;
  emailDomain?: string | undefined;
  onClose: () => void;
  onSaved: () => Promise<void>;
};

export default function ProfessionalEditor({
  professional,
  products,
  assignedProductIds,
  currentEmail,
  emailDomain,
  onClose,
  onSaved,
}: Readonly<ProfessionalEditorProps>): JSX.Element {
  const [name, setName] = useState<string>(professional?.name ?? '');
  const [phone, setPhone] = useState<string>(professional?.phoneE164 ?? '');
  const [photoUrl, setPhotoUrl] = useState<string>(professional?.photoUrl ?? '');
  const [active, setActive] = useState<boolean>(professional?.active ?? true);
  const [productIds, setProductIds] = useState<string[]>(assignedProductIds);
  const [email, setEmail] = useState<string>(currentEmail ?? '');
  const [password, setPassword] = useState<string>('');
  const [notice, setNotice] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const toggleProduct = (productId: string): void => {
    setProductIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  };

  const submit = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const saved = await saveProfessional({
        ...(professional ? { id: professional.id } : {}),
        name,
        phone,
        photoUrl,
        active,
        productIds,
      });
      const professionalId = professional?.id ?? saved.id;
      if (email.trim() || password) {
        await saveCollaboratorAccount({
          professionalId,
          email,
          ...(password ? { password } : {}),
        });
      }
      await onSaved();
      onClose();
    } catch (error: unknown) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async (): Promise<void> => {
    if (!professional) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await resetCollaboratorPassword({ professionalId: professional.id, password });
      setPassword('');
      setNotice('Senha redefinida. Informe a nova senha ao colaborador.');
    } catch (error: unknown) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <section
        className="editor-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="professional-editor-title"
      >
        <header className="editor-header">
          <div>
            <p className="eyebrow">EQUIPE</p>
            <h2 id="professional-editor-title">
              {professional ? 'Editar colaborador' : 'Novo colaborador'}
            </h2>
          </div>
          <button className="icon-button" aria-label="Fechar" onClick={onClose}>
            ×
          </button>
        </header>
        <form className="form-stack" onSubmit={(event) => void submit(event)}>
          <label>
            Nome completo
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={100}
              required
            />
          </label>
          <label>
            Telefone com DDD
            <input
              type="tel"
              autoComplete="tel"
              placeholder="(11) 99999-0000"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              required
            />
          </label>
          <label>
            Foto (URL, opcional)
            <input
              type="url"
              value={photoUrl}
              onChange={(event) => setPhotoUrl(event.target.value)}
              placeholder="https://…"
            />
          </label>
          <fieldset className="assignment-fieldset">
            <legend>Acesso à plataforma</legend>
            <label>
              E-mail de acesso
              <input
                type="email"
                autoComplete="off"
                placeholder={`nome@${emailDomain ?? 'suaempresa.com.br'}`}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label>
              {currentEmail ? 'Nova senha' : 'Senha inicial'}
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            {currentEmail && (
              <button
                type="button"
                className="button secondary compact"
                disabled={busy || password.length < 8}
                onClick={() => void resetPassword()}
              >
                Redefinir senha
              </button>
            )}
            {notice && <p role="status">{notice}</p>}
          </fieldset>
          <fieldset className="assignment-fieldset">
            <legend>Serviços que realiza</legend>
            {products.length === 0 ? (
              <p className="muted">Cadastre serviços antes de associá-los à equipe.</p>
            ) : (
              products.map((product) => (
                <label className="check-row" key={product.id}>
                  <input
                    type="checkbox"
                    checked={productIds.includes(product.id)}
                    onChange={() => toggleProduct(product.id)}
                  />
                  <span>
                    {product.name}
                    <small>{product.active ? 'Ativo no catálogo' : 'Serviço inativo'}</small>
                  </span>
                </label>
              ))
            )}
          </fieldset>
          <label className="toggle-row">
            <span>
              <strong>Colaborador ativo</strong>
              <small>Desative para impedir novos agendamentos.</small>
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
              {busy ? 'Salvando…' : 'Salvar colaborador'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
