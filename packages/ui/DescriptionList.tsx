import type { ReactNode } from 'react';
import { joinClasses } from './layoutUtils';
import './Layout.scss';

export interface DescriptionListItem {
  term: string;
  value: ReactNode;
}

export interface DescriptionListProps {
  items: DescriptionListItem[];
  className?: string;
}

export function DescriptionList({ items, className }: DescriptionListProps) {
  return (
    <dl className={joinClasses('nb-description-list', className)}>
      {items.map((item) => (
        <div key={item.term} className="nb-description-list__row">
          <dt>{item.term}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}