import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import HomePage from './HomePage';

afterEach(cleanup);

describe('HomePage', () => {
  it('guides visitors to use a business link without offering discovery', () => {
    render(<HomePage />);

    expect(
      screen.getByRole('heading', { name: 'Acesse o catálogo do seu negócio' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Peça o link diretamente ao negócio para conhecer os serviços e agendar.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
