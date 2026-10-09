import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PwaInstallPrompt from './PwaInstallPrompt';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('PwaInstallPrompt', () => {
  it('shows iOS home-screen installation instructions', async () => {
    vi.stubGlobal('navigator', {
      userAgent: 'iPhone',
      platform: 'iPhone',
      maxTouchPoints: 1,
      standalone: false,
    });

    render(<PwaInstallPrompt businessName="Studio Aurora" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Adicionar app' }));

    expect(screen.getByRole('dialog')).toHaveTextContent('Adicione Studio Aurora à tela inicial');
    expect(screen.getByText(/Abra esta página no Safari/)).toBeInTheDocument();
  });

  it('does not show an installation prompt outside iOS', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Desktop browser',
      platform: 'Win32',
      maxTouchPoints: 0,
      standalone: false,
    });

    render(<PwaInstallPrompt businessName="Studio Aurora" />);

    expect(screen.queryByRole('button', { name: 'Adicionar app' })).not.toBeInTheDocument();
  });

  it('lets the user dismiss the installation prompt', async () => {
    vi.stubGlobal('navigator', {
      userAgent: 'iPhone',
      platform: 'iPhone',
      maxTouchPoints: 1,
      standalone: false,
    });

    render(<PwaInstallPrompt businessName="Studio Aurora" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Fechar aviso de instalação' }));

    expect(screen.queryByRole('button', { name: 'Adicionar app' })).not.toBeInTheDocument();
  });
});
