import { beforeEach, describe, expect, it, vi } from 'vitest';

const sentryMocks = vi.hoisted(() => ({
  initializeMonitoring: vi.fn(),
  addRouteBreadcrumb: vi.fn(),
}));

vi.mock('./sentry.config', () => sentryMocks);

describe('Sentry loader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes only after the first pointer or keyboard interaction', async () => {
    const { initializeMonitoringOnFirstInteraction } = await import('./sentry-loader');
    initializeMonitoringOnFirstInteraction();

    expect(sentryMocks.initializeMonitoring).not.toHaveBeenCalled();

    window.dispatchEvent(new Event('pointerdown'));
    await vi.waitFor(() => {
      expect(sentryMocks.initializeMonitoring).toHaveBeenCalledOnce();
    });

    window.dispatchEvent(new KeyboardEvent('keydown'));
    expect(sentryMocks.initializeMonitoring).toHaveBeenCalledOnce();
    expect(sentryMocks.addRouteBreadcrumb).toHaveBeenCalledWith(window.location.pathname);
  });
});
