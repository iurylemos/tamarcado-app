type MonitoringModule = typeof import('./sentry.config');

let monitoringPromise: Promise<MonitoringModule> | undefined;

export function ensureMonitoringInitialized(): Promise<MonitoringModule> {
  if (!monitoringPromise) {
    monitoringPromise = import('./sentry.config')
      .then((monitoring) => {
        monitoring.initializeMonitoring();
        return monitoring;
      })
      .catch((error: unknown) => {
        monitoringPromise = undefined;
        throw error;
      });
  }

  return monitoringPromise;
}

export function initializeMonitoringOnFirstInteraction(): void {
  let started = false;

  const initialize = (): void => {
    if (started) return;
    started = true;
    window.removeEventListener('pointerdown', initialize);
    window.removeEventListener('keydown', initialize);

    void ensureMonitoringInitialized()
      .then(({ addRouteBreadcrumb }) => addRouteBreadcrumb(window.location.pathname))
      .catch((error: unknown) => {
        console.error('Failed to initialize Sentry after user interaction.', error);
      });
  };

  window.addEventListener('pointerdown', initialize, { once: true, passive: true });
  window.addEventListener('keydown', initialize, { once: true });
}
