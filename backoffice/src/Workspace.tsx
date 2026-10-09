import { useCallback, useEffect, useState, type JSX } from 'react';
import { useAuth } from './contexts/auth/auth.context';
import { errorMessage, getWorkspace } from './services/admin.service';
import type { BackofficeSection, BackofficeWorkspace } from './interfaces/admin.interface';
import ProductsPage from './pages/ProductsPage';
import ProfessionalsPage from './pages/ProfessionalsPage';
import AvailabilityPage from './pages/AvailabilityPage';
import CompanySettingsPage from './pages/CompanySettingsPage';
import DashboardPage from './pages/DashboardPage';
import ReportsPage from './pages/ReportsPage';
import LoadingScreen from './components/atoms/LoadingScreen/LoadingScreen';

const sectionLabels: Record<BackofficeSection, string> = {
  dashboard: 'Visão geral',
  company: 'Empresa',
  products: 'Serviços',
  professionals: 'Equipe',
  availability: 'Agenda',
  reports: 'Relatórios',
};

export default function BackofficeWorkspace(): JSX.Element {
  const { user, logout } = useAuth();
  const [workspace, setWorkspace] = useState<BackofficeWorkspace | null>(null);
  const [section, setSection] = useState<BackofficeSection>('dashboard');
  const [loading, setLoading] = useState<boolean>(true);
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
    if (user) void refreshWorkspace();
    else {
      setWorkspace(null);
      setLoading(false);
    }
  }, [refreshWorkspace, user]);

  if (loading) return <LoadingScreen message="Carregando os dados da empresa..." />;

  if (!workspace) {
    return (
      <main className="loading-screen" role={error ? 'alert' : 'status'}>
        {error || 'Não foi possível carregar a empresa.'}
        {error && (
          <button type="button" onClick={() => void refreshWorkspace()}>
            Tentar novamente
          </button>
        )}
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
          {(Object.keys(sectionLabels) as BackofficeSection[]).map((item) => (
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
          <button className="text-button signout-button" onClick={() => void logout()}>
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
            <ProductsPage
              tenantId={workspace.company.id}
              products={workspace.products}
              onSaved={refreshWorkspace}
            />
          )}
          {section === 'professionals' && (
            <ProfessionalsPage
              professionals={workspace.professionals}
              products={workspace.products}
              assignments={workspace.assignments}
              collaboratorEmails={workspace.collaboratorEmails ?? {}}
              emailDomain={workspace.company.emailDomain}
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
