import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import Card from './index';

describe('Card', () => {
  it('shows an image, summary, detail and action', () => {
    render(
      <MemoryRouter>
        <Card
          title="Studio Aurora"
          imageUrl="/salon.jpg"
          description="Cuidado e beleza"
          detail="São Paulo"
          href="/empresa/studio-aurora"
          actionLabel="Agendar"
        >
          <span>Conteúdo extra</span>
        </Card>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Studio Aurora' })).toBeInTheDocument();

    expect(screen.getByText('Cuidado e beleza')).toBeInTheDocument();

    expect(screen.getByRole('presentation')).toHaveAttribute('src', '/salon.jpg');

    expect(screen.getByRole('link', { name: 'Agendar' })).toHaveAttribute(
      'href',
      '/empresa/studio-aurora',
    );

    expect(screen.getByText('Conteúdo extra')).toBeInTheDocument();
  });
});
