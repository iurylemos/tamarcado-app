import type { CSSProperties, JSX } from 'react';

export type SkeletonProps = {
  className?: string;
  height?: number | string;
  width?: number | string;
};

export default function Skeleton({
  className = '',
  height,
  width,
}: Readonly<SkeletonProps>): JSX.Element {
  const style: CSSProperties = {
    ...(height === undefined ? {} : { height }),
    ...(width === undefined ? {} : { width }),
  };

  return <span aria-hidden="true" className={`skeleton ${className}`.trim()} style={style} />;
}
