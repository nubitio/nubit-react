import React, { ReactNode } from 'react';
import './Chip.scss';

export interface ChipProps {
  /** Displayed label */
  label: ReactNode;
  /** Whether the chip is in selected/active state */
  active?: boolean;
  /** Optional count badge shown inside the chip */
  count?: number;
  /** Optional leading icon class (e.g. 'ph ph-tag') */
  icon?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Disabled state */
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * Pill-shaped filter/tag chip. Stateless — caller controls `active`.
 * Use for category filters, tag lists, and multi-select inputs.
 */
export const Chip = ({
  label,
  active = false,
  count,
  icon,
  size = 'md',
  disabled = false,
  onClick,
  className = '',
}: ChipProps) => {
  const sizeClass = size !== 'md' ? ` nb-chip--${size}` : '';
  const activeClass = active ? ' is-active' : '';

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={active}
      aria-pressed={active}
      disabled={disabled}
      className={`nb-chip${sizeClass}${activeClass}${className ? ` ${className}` : ''}`}
      onClick={onClick}
    >
      {icon && <i className={icon} aria-hidden="true" />}
      {label}
      {count !== undefined && (
        <span className="nb-chip__count">{count}</span>
      )}
    </button>
  );
};
