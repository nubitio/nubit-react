import { forwardRef, useEffect, useId, useRef } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import './SelectionControls.scss';

export interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'size'
> {
  label?: ReactNode;
  indeterminate?: boolean;
  invalid?: boolean;
}

/** Native checkbox, including the mixed state used by bulk selection. */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, indeterminate = false, invalid = false, id, className, ...props },
  ref,
) {
  const generatedId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <label className={`nb-selection-control${className ? ` ${className}` : ''}`}>
      <input
        {...props}
        id={id ?? generatedId}
        type="checkbox"
        aria-invalid={props['aria-invalid'] ?? (invalid || undefined)}
        ref={(node) => {
          inputRef.current = node;
          if (typeof ref === 'function') return ref(node);
          if (ref) ref.current = node;
        }}
      />
      {label && <span>{label}</span>}
    </label>
  );
});
