import { useState, type JSX, type SubmitEvent } from 'react';
import { formatBrazilianPhone } from '@shared/phone';
import type { CompanyRecord } from '../interfaces/admin.interface';
import { errorMessage, saveCompany } from '../services/admin.service';

type CompanySettingsPageProps = {
  company: CompanyRecord;
  onSaved: () => Promise<void>;
};

const segmentLabels: Record<string, string> = {
  beauty: 'Beleza e bem-estar',
  health: 'Saúde',
  fitness: 'Atividade física',
  automotive: 'Automotivo',
  other: 'Outro',
};

export default function CompanySettingsPage({
  company,
  onSaved,
}: CompanySettingsPageProps): JSX.Element {
  const [name, setName] = useState<string>(company.name);
  const [slug, setSlug] = useState<string>(company.slug);
  const [segment, setSegment] = useState<string>(company.segment);
  const [description, setDescription] = useState<string>(company.description ?? '');
  const [phone, setPhone] = useState<string>(formatBrazilianPhone(company.phoneE164 ?? ''));
  const [logoUrl, setLogoUrl] = useState<string>(company.logoUrl ?? '');
  const [emailDomain, setEmailDomain] = useState<string>(company.emailDomain ?? '');
  const [timezone, setTimezone] = useState<string>(company.timezone);
  const [bookingIntervalMinutes, setBookingIntervalMinutes] = useState(
    String(company.bookingIntervalMinutes),
  );
  const [active, setActive] = useState<boolean>(company.active);
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [saved, setSaved] = useState<boolean>(false);

  const submit = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    setBusy(true);
    setError('');
    setSaved(false);

    try {
      await saveCompany({
        name,
        slug,
        segment,
        description,
        phone,
        logoUrl,
        emailDomain,
        timezone,
        bookingIntervalMinutes: Number(bookingIntervalMinutes),
        active,
      });
      await onSaved();
      setSaved(true);
    } catch (error: unknown) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <header className="page-heading">
        <div>
          <p className="eyebrow">CONFIGURAÇÕES</p>
          <h1>Dados da empresa</h1>
          <p className="muted">
            Essas informações identificam sua empresa e compõem a página pública.
          </p>
        </div>
        <span className={`status-pill ${active ? 'positive' : 'neutral'}`}>
          {active ? 'Empresa ativa' : 'Empresa inativa'}
        </span>
      </header>
      <form className="settings-layout" onSubmit={(event) => void submit(event)}>
        <section className="content-card settings-card">
          <header className="section-heading">
            <div>
              <h2>Perfil público</h2>
              <p className="muted">Informações visíveis para clientes.</p>
            </div>
          </header>
          <label>
            Nome da empresa
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={100}
              required
            />
          </label>
          <label>
            Endereço público
            <div className="slug-input">
              <span>tamarcado.com/</span>
              <input
                value={slug}
                onChange={(event) => setSlug(event.target.value.toLowerCase())}
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                required
              />
            </div>
          </label>
          <label>
            Segmento
            <select
              value={segment}
              onChange={(event) => setSegment(event.target.value as CompanyRecord['segment'])}
            >
              {Object.entries(segmentLabels).map(([key, label]) => (
                <option value={key} key={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Descrição pública
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={1000}
              rows={4}
              placeholder="Conte um pouco sobre sua empresa…"
            />
          </label>
          <label>
            Telefone de contato
            <input
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              value={phone}
              onChange={(event) => setPhone(formatBrazilianPhone(event.target.value))}
              placeholder="(11) 99999-0000"
            />
          </label>
          <label>
            Domínio de e-mail dos colaboradores
            <input
              value={emailDomain}
              onChange={(event) => setEmailDomain(event.target.value.toLowerCase())}
              placeholder="suaempresa.com.br"
            />
            <small className="muted">
              Os acessos dos colaboradores usam e-mails como nome@
              {emailDomain || 'suaempresa.com.br'}.
            </small>
          </label>
          <label>
            Logo (URL)
            <input
              type="url"
              value={logoUrl}
              onChange={(event) => setLogoUrl(event.target.value)}
              placeholder="https://…"
            />
          </label>
          {logoUrl && (
            <div className="image-preview logo-preview">
              <img src={logoUrl} alt="Prévia da logo da empresa" />
              <span>Prévia do logo</span>
            </div>
          )}
        </section>
        <aside className="settings-side">
          <section className="content-card">
            <header className="section-heading">
              <div>
                <h2>Agendamentos</h2>
                <p className="muted">Preferências de disponibilidade.</p>
              </div>
            </header>
            <label>
              Fuso horário IANA
              <input
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
                placeholder="America/Sao_Paulo"
                required
              />
            </label>
            <label>
              Intervalo entre horários
              <select
                value={bookingIntervalMinutes}
                onChange={(event) => setBookingIntervalMinutes(event.target.value)}
              >
                {[5, 10, 15, 20, 30, 45, 60].map((minutes) => (
                  <option value={minutes} key={minutes}>
                    {minutes} minutos
                  </option>
                ))}
              </select>
            </label>
            <label className="toggle-row">
              <span>
                <strong>Empresa ativa</strong>
                <small>Empresas inativas não recebem agendamentos.</small>
              </span>
              <input
                type="checkbox"
                checked={active}
                onChange={(event) => setActive(event.target.checked)}
              />
            </label>
          </section>
          <section className="public-preview">
            <span className="preview-label">PRÉVIA DO ENDEREÇO</span>
            <strong>tamarcado.com/{slug || 'sua-empresa'}</strong>
            <p>{segmentLabels[segment] ?? segment}</p>
          </section>
        </aside>
        <div className="settings-actions">
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          {saved && (
            <p className="notice success" role="status">
              Alterações salvas e página pública atualizada.
            </p>
          )}
          <button className="button primary" disabled={busy}>
            {busy ? 'Salvando…' : 'Salvar alterações'}
          </button>
        </div>
      </form>
    </section>
  );
}
