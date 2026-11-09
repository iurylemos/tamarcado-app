import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import FallbackLoading from './index';

afterEach(cleanup);

describe('FallbackLoading', () => {
  it('keeps the default Tá Marcado identity without a business', () => {
    render(<FallbackLoading message="Carregando página..." />);

    const status = screen.getByRole('status');
    expect(status).toHaveStyle('--fb-main: #f97316');
    expect(screen.getByText('Tá Marcado')).toBeInTheDocument();
    expect(screen.getByText('Carregando página...')).toBeInTheDocument();
  });

  it('uses the business colors, name and logo', () => {
    const { container } = render(
      <FallbackLoading
        message="Carregando página..."
        business={{
          id: 'aurora',
          name: 'Studio Aurora',
          slug: 'studio-aurora',
          segment: 'beauty',
          logoUrl: 'https://example.com/logo.png',
          primaryColor: '#112233',
          secondaryColor: '#abcdef',
        }}
      />,
    );

    const status = screen.getByRole('status');
    expect(status).toHaveStyle('--fb-main: #112233');
    expect(status).toHaveStyle('--fb-accent: #abcdef');
    expect(screen.getByText('Studio Aurora')).toBeInTheDocument();
    expect(screen.queryByText('Tá Marcado')).not.toBeInTheDocument();
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://example.com/logo.png');
  });
});
