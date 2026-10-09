import type { JSX } from 'react';
import Skeleton from '../../atoms/Skeleton/Skeleton.js';

export type SkeletonCardVariant = 'product' | 'store' | 'service' | 'booking' | 'time';

type SkeletonCardProps = {
  variant: SkeletonCardVariant;
};

export default function SkeletonCard({ variant }: Readonly<SkeletonCardProps>): JSX.Element {
  if (variant === 'time') {
    return (
      <div aria-hidden="true" className="skeleton-card skeleton-card--time">
        <Skeleton className="skeleton-card__time" />
      </div>
    );
  }

  if (variant === 'booking') {
    return (
      <div aria-hidden="true" className="skeleton-card skeleton-card--booking">
        <Skeleton className="skeleton-card__eyebrow" width="38%" />
        <Skeleton className="skeleton-card__title" width="72%" />
        <Skeleton className="skeleton-card__metadata" width="50%" />
      </div>
    );
  }

  return (
    <div aria-hidden="true" className={`skeleton-card skeleton-card--${variant}`}>
      <Skeleton className="skeleton-card__image" />
      <div className="skeleton-card__body">
        <Skeleton className="skeleton-card__title" width="76%" />
        <Skeleton className="skeleton-card__metadata" width="54%" />
      </div>
    </div>
  );
}
