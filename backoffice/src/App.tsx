import { useCallback, useEffect, useState, type JSX, type SubmitEvent } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from './config/firebase.config';
import { errorMessage, getWorkspace } from './services/admin.service';
import type { BackofficeWorkspace } from './interfaces/admin.interface';
import ProductsPage from './pages/ProductsPage';
import ProfessionalsPage from './pages/ProfessionalsPage';
import AvailabilityPage from './pages/AvailabilityPage';
import CompanySettingsPage from './pages/CompanySettingsPage';
import DashboardPage from './pages/DashboardPage';
import ReportsPage from './pages/ReportsPage';

type Section = 'dashboard' | 'company' | 'products' | 'professionals' | 'availability' | 'reports';

const sectionLabels: Record<Section, string> = {
  dashboard: 'Visão geral',
  company: 'Empresa',
  products: 'Serviços',
  professionals: 'Equipe',
  availability: 'Agenda',
  reports: 'Relatórios',
};

export default function App(): JSX.Element {
  const [workspace, setWorkspace] = useState<BackofficeWorkspace | null>(null);
  const [section, setSection] = useState<Section>('dashboard');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const refreshWorkspace = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError('');

    try {
      const data = await getWorkspace();
      setWorkspace(data);
    } catch (error: unknown) {
      setWorkspace(null);
      setError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        void refreshWorkspace();
      } else {
        setWorkspace(null);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, [refreshWorkspace]);

  const handleLogin = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      await auth.currentUser?.getIdToken(true);
    } catch (error: unknown) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async (): Promise<void> => {
    await signOut(auth);
  };

  if (loading) {
    return (
      <main className="loading-screen" role="status">
        Carregando dados da empresa…
      </main>
    );
  }

  if (!workspace) {
    return (
      <main className="login-layout">
        <section className="login-card">
          <div className="brand-mark" aria-hidden="true">
            t
          </div>
          <p className="eyebrow">TAMARCADO · BACKOFFICE</p>
          <h1>Gestão da empresa</h1>
          <p className="muted">Acesse o painel para administrar serviços, equipe e horários.</p>
          <form className="form-stack" onSubmit={handleLogin}>
            <label>
              E-mail
              <input
                autoComplete="username"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label>
              Senha
              <input
                autoComplete="current-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            {error && (
              <p className="notice error" role="alert">
                {error}
              </p>
            )}
            <button className="button primary full-width" disabled={busy}>
              {busy ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
          <p className="login-hint">Emulador: admin@aurora.test · EmulatorOnly123!</p>
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <span className="brand-mark">t</span>
          <span>tamarcado</span>
        </div>
        <p className="sidebar-caption">ESPAÇO DA EMPRESA</p>
        <div className="tenant-switcher">
          <span className="tenant-avatar">{workspace.company.name.charAt(0)}</span>
          <span>
            <strong>{workspace.company.name}</strong>
            <small>Plano profissional</small>
          </span>
          <span aria-hidden="true">⌄</span>
        </div>
        <nav aria-label="Navegação principal" className="side-nav">
          {(Object.keys(sectionLabels) as Section[]).map((item) => (
            <button
              className={`nav-item ${section === item ? 'selected' : ''}`}
              key={item}
              onClick={() => setSection(item)}
              aria-current={section === item ? 'page' : undefined}
            >
              <span className="nav-icon" aria-hidden="true">
                {item === 'company'
                  ? '⌂'
                  : item === 'products'
                    ? '◇'
                    : item === 'professionals'
                      ? '♙'
                      : item === 'availability'
                        ? '▦'
                        : item === 'reports'
                          ? '$'
                          : '◷'}
              </span>
              {sectionLabels[item]}
              {item === 'products' && (
                <span className="nav-count">{workspace.products.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="profile-chip">
            <span className="profile-avatar">AD</span>
            <span>
              <strong>Administrador</strong>
              <small>Backoffice</small>
            </span>
          </div>
          <button className="text-button signout-button" onClick={() => void handleSignOut()}>
            Sair da conta
          </button>
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <span className="breadcrumb">
            Painel <span>/</span> {sectionLabels[section]}
          </span>
          <span className="online-state">
            <i /> Emulador conectado
          </span>
        </header>
        <div className="page-content">
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          {section === 'company' && (
            <CompanySettingsPage company={workspace.company} onSaved={refreshWorkspace} />
          )}
          {section === 'products' && (
            <ProductsPage products={workspace.products} onSaved={refreshWorkspace} />
          )}
          {section === 'professionals' && (
            <ProfessionalsPage
              professionals={workspace.professionals}
              products={workspace.products}
              assignments={workspace.assignments}
              onSaved={refreshWorkspace}
            />
          )}
          {section === 'availability' && (
            <AvailabilityPage
              professionals={workspace.professionals}
              workingHours={workspace.workingHours}
              blockedPeriods={workspace.blockedPeriods}
              bookingIntervalMinutes={workspace.company.bookingIntervalMinutes}
              timezone={workspace.company.timezone}
              onSaved={refreshWorkspace}
            />
          )}
          {section === 'dashboard' && (
            <DashboardPage
              timezone={workspace.company.timezone}
              products={workspace.products}
              onOpenReports={() => setSection('reports')}
            />
          )}
          {section === 'reports' && (
            <ReportsPage
              timezone={workspace.company.timezone}
              products={workspace.products}
              professionals={workspace.professionals}
            />
          )}
        </div>
      </main>
    </div>
  );
}
