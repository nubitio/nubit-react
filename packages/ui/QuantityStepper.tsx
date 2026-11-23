import type { ReactNode } from 'react';
import './QuantityStepper.scss';

export interface QuantityStepperProps {
  value: number;
  onChange: (next: number) => void;
  /** Accessible name of the quantity, e.g. the product name. */
  label: string;
  min?: number;
  max?: number;
  /** Amount added or removed per click. Fractions are fine (0.5, 0.25). Default 1. */
  step?: number;
  disabled?: boolean;
  /** Shown next to the value, e.g. "und" or "kg". */
  unit?: ReactNode;
  /** Format the shown value. Defaults to trimming float noise. */
  format?: (value: number) => string;
  className?: string;
}

const decimalsOf = (n: number) => {
  const [, fraction = ''] = String(n).split('.');
  return fraction.length;
};

/** Round away binary float noise (0.1 + 0.2) to the finest decimal place involved. */
const settle = (value: number, ...references: number[]) => {
  const places = Math.max(...references.map(decimalsOf), decimalsOf(value));
  return Number(value.toFixed(Math.min(places, 6)));
};

/**
 * +/- control for a quantity. Clamps to `[min, max]` and lands exactly on `max`
 * when a step would overshoot it, so a 0.5 limit is reachable with `step={1}`.
 */
export function QuantityStepper({
  value,
  onChange,
  label,
  min = 0,
  max,
  step = 1,
  disabled = false,
  unit,
  format,
  className,
}: QuantityStepperProps) {
  const clamp = (next: number) => {
    const bounded = Math.max(min, max === undefined ? next : Math.min(max, next));
    return settle(bounded, step, min, max ?? 0, value);
  };
  const atMin = value <= min;
  const atMax = max !== undefined && value >= max;
  const shown = format ? format(value) : String(settle(value, step));

  return (
    <div
      className={['nb-quantity-stepper', className].filter(Boolean).join(' ')}
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        className="nb-quantity-stepper__button"
        disabled={disabled || atMin}
        aria-label={`Menos ${label}`}
        onClick={() => onChange(clamp(value - step))}
      >
        <i className="ph ph-minus" aria-hidden="true" />
      </button>
      <output className="nb-quantity-stepper__value" aria-live="polite" aria-label={label}>
        {shown}
        {unit ? <span className="nb-quantity-stepper__unit"> {unit}</span> : null}
      </output>
      <button
        type="button"
        className="nb-quantity-stepper__button"
        disabled={disabled || atMax}
        aria-label={`Más ${label}`}
        onClick={() => onChange(clamp(value + step))}
      >
        <i className="ph ph-plus" aria-hidden="true" />
      </button>
    </div>
  );
}
