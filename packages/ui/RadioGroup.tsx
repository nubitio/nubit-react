import { useId } from 'react';
import type { FieldsetHTMLAttributes, ReactNode } from 'react';
import './SelectionControls.scss';

export interface RadioGroupOption<T extends string = string> {
  value: T;
  label: ReactNode;
  disabled?: boolean;
}

export interface RadioGroupProps<T extends string = string> extends Omit<
  FieldsetHTMLAttributes<HTMLFieldSetElement>,
  'onChange'
> {
  label?: ReactNode;
  name?: string;
  value: T;
  options: RadioGroupOption<T>[];
  onChange: (value: T) => void;
  orientation?: 'horizontal' | 'vertical';
  required?: boolean;
  invalid?: boolean;
}

/** Native radios share a name for browser keyboard navigation and form submission. */
export function RadioGroup<T extends string = string>({
  label,
  name,
  value,
  options,
  onChange,
  orientation = 'vertical',
  required,
  invalid = false,
  disabled,
  className,
  ...props
}: RadioGroupProps<T>) {
  const generatedName = useId();
  return (
    <fieldset
      {...props}
      disabled={disabled}
      aria-invalid={props['aria-invalid'] ?? (invalid || undefined)}
      className={`nb-radio-group${className ? ` ${className}` : ''}`}
    >
      {label && <legend>{label}</legend>}
      <div className={`nb-radio-group__options nb-radio-group__options--${orientation}`}>
        {options.map((option) => (
          <label key={option.value} className="nb-selection-control">
            <input
              type="radio"
              name={name ?? generatedName}
              value={option.value}
              checked={value === option.value}
              disabled={disabled || option.disabled}
              required={required}
              onChange={() => onChange(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
