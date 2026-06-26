import type { ReactNode } from 'react';
import './SegmentedControl.scss';

export interface SegmentedControlOption<T extends string = string> {
  value: T;
  label: ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
  size?: 'sm' | 'md';
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  ariaLabel,
  className = '',
  size = 'md',
}: SegmentedControlProps<T>) {
  if (options.length === 0) {
    return null;
  }

  const sizeClass = size === 'sm' ? ' nb-segmented-control--sm' : '';

  return (
    <div
      className={`nb-segmented-control${sizeClass}${className ? ` ${className}` : ''}`}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            className={`nb-segmented-control__btn${active ? ' nb-segmented-control__btn--active' : ''}`}
            aria-pressed={active}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}