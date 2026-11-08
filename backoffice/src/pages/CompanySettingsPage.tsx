import { useEffect, useMemo, useState, type JSX, type SubmitEvent } from 'react';
import { normalizeHexColor } from '@shared/color';
import { formatBrazilianPhone } from '@shared/phone';
import type { CompanyRecord } from '../interfaces/admin.interface';
import { errorMessage, saveCompany } from '../services/admin.service';
import { ColorUtil } from '../utils/color.util';
import { CompanyUtil } from '../utils/company.util';

type CompanySettingsPageProps = {
  company: CompanyRecord;
  onSaved: () => Promise<void>;
};

export default function CompanySettingsPage({
  company,
  onSaved,
}: Readonly<CompanySettingsPageProps>): JSX.Element {
  const [name, setName] = useState<string>(company.name);
  const [slug, setSlug] = useState<string>(company.slug);
  const [segment, setSegment] = useState<string>(company.segment);
  const [description, setDescription] = useState<string>(company.description ?? '');
  const [phone, setPhone] = useState<string>(formatBrazilianPhone(company.phoneE164 ?? ''));
  const [logoUrl, setLogoUrl] = useState<string>(company.logoUrl ?? '');
  const [primaryColor, setPrimaryColor] = useState<string>(
    company.primaryColor ?? ColorUtil.defaultPrimaryColor,
  );
  const [secondaryColor, setSecondaryColor] = useState<string>(
    company.secondaryColor ?? ColorUtil.defaultSecondaryColor,
  );
  const [emailDomain, setEmailDomain] = useState<string>(company.emailDomain ?? '');
  const [timezone, setTimezone] = useState<string>(company.timezone);
  const [bookingIntervalMinutes, setBookingIntervalMinutes] = useState(
    String(company.bookingIntervalMinutes),
  );
  const [active, setActive] = useState<boolean>(company.active);
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [saved, setSaved] = useState<boolean>(false);

  useEffect(() => {
    setPrimaryColor(company.primaryColor ?? ColorUtil.defaultPrimaryColor);
    setSecondaryColor(company.secondaryColor ?? ColorUtil.defaultSecondaryColor);
  }, [company.id, company.primaryColor, company.secondaryColor]);

  const normalizedPrimaryColor = useMemo<string | null>(
    () => normalizeHexColor(primaryColor),
    [primaryColor],
  );
  const normalizedSecondaryColor = useMemo<string | null>(
    () => normalizeHexColor(secondaryColor),
    [secondaryColor],
  );

  const submit = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!normalizedPrimaryColor || !normalizedSecondaryColor) {
      setError(ColorUtil.invalidColorMessage);
      setSaved(false);
      return;
    }

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
        primaryColor: normalizedPrimaryColor,
        secondaryColor: normalizedSecondaryColor,
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
      <form
        className="settings-layout"
        onSubmit={(event: SubmitEvent<HTMLFormElement>) => void submit(event)}
      >
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
              {Object.entries(CompanyUtil.segmentLabels).map(([key, label]) => (
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
          <section className="company-colors" aria-labelledby="company-colors-heading">
            <header className="section-heading">
              <div>
                <h2 id="company-colors-heading">Identidade visual</h2>
                <p className="muted">Escolha as cores da sua empresa.</p>
              </div>
            </header>
            <div className="company-color-controls">
              <div className="company-color-control">
                <div className="company-color-inputs">
                  <label>
                    Seletor de cor primária
                    <input
                      type="color"
                      aria-label="Seletor de cor primária"
                      value={normalizedPrimaryColor ?? ColorUtil.defaultPrimaryColor}
                      onChange={(event) => {
                        setPrimaryColor(event.target.value);
                        setError('');
                      }}
                    />
                  </label>
                  <label>
                    Cor primária em hexadecimal
                    <input
                      type="text"
                      value={primaryColor}
                      maxLength={7}
                      aria-invalid={!normalizedPrimaryColor}
                      aria-describedby={normalizedPrimaryColor ? undefined : 'primary-color-error'}
                      onChange={(event) => {
                        const value = event.target.value;
                        setPrimaryColor(normalizeHexColor(value) ?? value);
                        setError('');
                      }}
                    />
                  </label>
                </div>
                {!normalizedPrimaryColor && (
                  <small id="primary-color-error" className="color-validation-error">
                    {ColorUtil.invalidColorMessage}
                  </small>
                )}
              </div>
              <div className="company-color-control">
                <div className="company-color-inputs">
                  <label>
                    Seletor de cor secundária
                    <input
                      type="color"
                      aria-label="Seletor de cor secundária"
                      value={normalizedSecondaryColor ?? ColorUtil.defaultSecondaryColor}
                      onChange={(event) => {
                        setSecondaryColor(event.target.value);
                        setError('');
                      }}
                    />
                  </label>
                  <label>
                    Cor secundária em hexadecimal
                    <input
                      type="text"
                      value={secondaryColor}
                      maxLength={7}
                      aria-invalid={!normalizedSecondaryColor}
                      aria-describedby={
                        normalizedSecondaryColor ? undefined : 'secondary-color-error'
                      }
                      onChange={(event) => {
                        const value = event.target.value;
                        setSecondaryColor(normalizeHexColor(value) ?? value);
                        setError('');
                      }}
                    />
                  </label>
                </div>
                {!normalizedSecondaryColor && (
                  <small id="secondary-color-error" className="color-validation-error">
                    {ColorUtil.invalidColorMessage}
                  </small>
                )}
              </div>
            </div>
            <div className="company-color-preview" aria-label="Prévia da identidade visual">
              <div>
                <span>Primária</span>
                <span
                  className="company-color-swatch"
                  role="img"
                  aria-label="Prévia da cor primária"
                  style={{
                    backgroundColor: normalizedPrimaryColor ?? ColorUtil.defaultPrimaryColor,
                  }}
                />
              </div>
              <div>
                <span>Secundária</span>
                <span
                  className="company-color-swatch"
                  role="img"
                  aria-label="Prévia da cor secundária"
                  style={{
                    backgroundColor: normalizedSecondaryColor ?? ColorUtil.defaultSecondaryColor,
                  }}
                />
              </div>
            </div>
          </section>
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
            <p>{CompanyUtil.segmentLabels[segment] ?? segment}</p>
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
