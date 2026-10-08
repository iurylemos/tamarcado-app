import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SkeletonCard from './SkeletonCard';

describe('SkeletonCard', () => {
  it('hides decorative loading shapes from assistive technology', () => {
    const { container } = render(<SkeletonCard variant="service" />);

    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(container.querySelector('.skeleton-card__image')).toBeInTheDocument();
  });
});
