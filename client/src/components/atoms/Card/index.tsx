import type { JSX, ReactNode } from 'react';
import { Link } from 'react-router-dom';

type CardProps = {
  title: string;
  imageUrl?: string;
  description?: string;
  detail?: string;
  href?: string;
  actionLabel?: string;
  children?: ReactNode;
};

export default function Card({
  title,
  imageUrl,
  description,
  detail,
  href,
  actionLabel = 'Ver detalhes',
  children,
}: Readonly<CardProps>): JSX.Element {
  return (
    <article className="card stack">
      {imageUrl && <img src={imageUrl} alt="" loading="lazy" />}
      <div className="stack">
        <h2>{title}</h2>
        {description && <p>{description}</p>}
        {detail && <p className="muted">{detail}</p>}
        {children}
        {href && (
          <Link className="button" to={href}>
            {actionLabel}
          </Link>
        )}
      </div>
    </article>
  );
}
