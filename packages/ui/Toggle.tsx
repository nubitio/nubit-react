import React, { useId } from 'react';
import './Toggle.scss';

export interface ToggleProps {
  /** Controlled checked value */
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Optional label rendered in a flex row alongside the toggle */
  label?: React.ReactNode;
  /** Size variant */
  size?: 'sm' | 'md';
  disabled?: boolean;
  /** Accessible name when no visible label is provided */
  'aria-label'?: string;
  className?: string;
}

/**
 * Accessible toggle switch. Always controlled — pass `checked` + `onChange`.
 * Renders a visually-hidden `<input type="checkbox">` with a custom track.
 *
 * With `label`: wraps in `.nb-toggle-row` for a label ↔ toggle layout.
 * Without `label`: renders bare `.nb-toggle`.
 */
export const Toggle = ({
  checked,
  onChange,
  label,
  size = 'md',
  disabled = false,
  'aria-label': ariaLabel,
  className = '',
}: ToggleProps) => {
  const id = useId();
  const sizeClass = size === 'sm' ? ' nb-toggle--sm' : '';

  const input = (
    <span className={`nb-toggle${sizeClass}${className ? ` ${className}` : ''}`}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={!label ? ariaLabel : undefined}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="nb-toggle__track" aria-hidden="true" />
    </span>
  );

  // The checkbox input is visually hidden with pointer-events: none — clicks
  // must land on a <label htmlFor> to reach it natively. Always wrap in a
  // label (even without visible text) so the track itself is clickable.
  return (
    <label htmlFor={id} className={label ? 'nb-toggle-row' : undefined}>
      {label && <span>{label}</span>}
      {input}
    </label>
  );
};
