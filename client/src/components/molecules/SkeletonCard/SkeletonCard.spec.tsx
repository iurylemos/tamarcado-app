import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SkeletonCard from './SkeletonCard';

describe('SkeletonCard', () => {
  it('keeps the service image area static while showing skeletons for its information', () => {
    const { container } = render(<SkeletonCard variant="service" imagePlaceholder />);

    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(container.querySelector('.skeleton-card__image-placeholder')).toBeInTheDocument();
    expect(container.querySelector('.skeleton-card__image')).not.toBeInTheDocument();
    expect(container.querySelector('.skeleton-card__price')).toBeInTheDocument();
    expect(container.querySelector('.skeleton-card__description')).toBeInTheDocument();
    expect(container.querySelectorAll('.skeleton')).toHaveLength(4);
  });
});
