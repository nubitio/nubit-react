import type { ReactNode } from 'react';
import './ScopeTabs.scss';

export interface ScopeTabOption {
  key: string;
  label: ReactNode;
}

export type ScopeTabsDensity = 'default' | 'compact';

export interface ScopeTabsProps {
  options: ScopeTabOption[];
  selectedKey: string | null;
  onChange: (key: string | null) => void;
  allLabel?: string;
  ariaLabel: string;
  density?: ScopeTabsDensity;
  className?: string;
  testId?: string;
}

/**
 * Pill tabs for scoping a list view (warehouse, branch, period, etc.).
 * Hides itself when there is at most one scope option.
 */
export function ScopeTabs({
  options,
  selectedKey,
  onChange,
  allLabel = 'Todos',
  ariaLabel,
  density = 'default',
  className = '',
  testId,
}: ScopeTabsProps) {
  if (options.length <= 1) {
    return null;
  }

  return (
    <div
      className={`nb-scope-tabs${density === 'compact' ? ' nb-scope-tabs--compact' : ''}${className ? ` ${className}` : ''}`}
      data-testid={testId}
      role="tablist"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        role="tab"
        aria-selected={selectedKey === null}
        className={`nb-scope-tabs__tab${selectedKey === null ? ' nb-scope-tabs__tab--active' : ''}`}
        onClick={() => onChange(null)}
      >
        {allLabel}
      </button>
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          role="tab"
          aria-selected={selectedKey === option.key}
          className={`nb-scope-tabs__tab${selectedKey === option.key ? ' nb-scope-tabs__tab--active' : ''}`}
          onClick={() => onChange(option.key)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}