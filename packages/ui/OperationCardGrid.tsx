import type { ReactNode } from 'react';
import './OperationCardGrid.scss';

export type OperationCardAccent =
  | 'default'
  | 'in'
  | 'out'
  | 'count'
  | 'adjust'
  | 'transfer'
  | 'info'
  | 'warning'
  | 'danger';

export interface OperationCardItem {
  key: string;
  title: string;
  description?: string;
  icon: string;
  accent?: OperationCardAccent;
  onClick: () => void;
  testId?: string;
}

export interface OperationCardGridProps {
  title?: string;
  description?: ReactNode;
  operations: OperationCardItem[];
  className?: string;
  testId?: string;
}

function normalizeIcon(icon: string): string {
  if (icon.startsWith('ph ')) return icon;
  if (icon.startsWith('ph-')) return `ph ${icon}`;
  return `ph ph-${icon}`;
}

export function OperationCardGrid({
  title,
  description,
  operations,
  className = '',
  testId,
}: OperationCardGridProps) {
  return (
    <div className={`nb-operation-grid${className ? ` ${className}` : ''}`} data-testid={testId}>
      {(title || description) && (
        <header className="nb-operation-grid__header">
          {title && <h3 className="nb-operation-grid__title">{title}</h3>}
          {description && <p className="nb-operation-grid__intro">{description}</p>}
        </header>
      )}
      <div className="nb-operation-grid__cards">
        {operations.map((operation) => {
          const accent = operation.accent ?? 'default';
          return (
            <button
              key={operation.key}
              type="button"
              className={`nb-operation-card nb-operation-card--${accent}`}
              data-testid={operation.testId}
              onClick={operation.onClick}
            >
              <span
                className={`nb-operation-card__icon nb-operation-card__icon--${accent}`}
                aria-hidden="true"
              >
                <i className={normalizeIcon(operation.icon)} />
              </span>
              <span className="nb-operation-card__body">
                <span className="nb-operation-card__title">{operation.title}</span>
                {operation.description && (
                  <span className="nb-operation-card__desc">{operation.description}</span>
                )}
              </span>
              <span className="nb-operation-card__arrow" aria-hidden="true">
                <i className="ph ph-caret-right" />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}