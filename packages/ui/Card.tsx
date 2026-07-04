import React from 'react';
import { joinClasses } from './layoutUtils';
import './Card.scss';

export type CardVariant = 'auth' | 'panel';

export interface CardProps {
  title?: string;
  description?: string;
  /** auth: centered narrow card (login). panel: full-width admin surface. */
  variant?: CardVariant;
  className?: string;
}

export const Card = ({
  title,
  description,
  variant = 'auth',
  className,
  children,
}: React.PropsWithChildren<CardProps>) => {
  const showHeader = Boolean(title || description);

  return (
    <div className={joinClasses('nb-card', variant === 'panel' && 'nb-card--panel', className)}>
      <div className="nb-card__content content">
        {showHeader && (
          <div className="header">
            {title && <div className="title">{title}</div>}
            {description && <div className="description">{description}</div>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
};
