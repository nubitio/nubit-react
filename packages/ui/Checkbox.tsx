import { useEffect, useId, useRef, type ReactNode } from 'react';
import './ChoiceControl.scss';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  disabled?: boolean;
  invalid?: boolean;
  indeterminate?: boolean;
  'aria-label'?: string;
  className?: string;
}

export function Checkbox({
  checked,
  onChange,
  label,
  disabled = false,
  invalid = false,
  indeterminate = false,
  'aria-label': ariaLabel,
  className,
}: CheckboxProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <label
      htmlFor={id}
      className={['nb-choice', disabled && 'nb-choice--disabled', className]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="nb-choice__control">
        <input
          ref={inputRef}
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-label={!label ? ariaLabel : undefined}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className="nb-choice__mark nb-choice__mark--checkbox" aria-hidden="true" />
      </span>
      {label ? <span className="nb-choice__label">{label}</span> : null}
    </label>
  );
}
