import React from 'react';
import './Card.scss';

export interface CardProps {
  title?: string;
  description?: string;
}

export const Card = ({ title, description, children }: React.PropsWithChildren<CardProps>) => {
  return (
    <div className="nb-card">
      <div className="nb-card__content content">
        <div className="header">
          <div className="title">{title}</div>
          <div className="description">{description}</div>
        </div>
        {children}
      </div>
    </div>
  );
};
