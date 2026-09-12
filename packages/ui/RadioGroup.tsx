import { createContext, useContext, useId, type ReactNode } from 'react';
import './ChoiceControl.scss';

export type RadioOrientation = 'row' | 'column';

interface RadioGroupContextValue {
  name: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

function useRadioGroup(): RadioGroupContextValue {
  const ctx = useContext(RadioGroupContext);
  if (!ctx) throw new Error('Radio must be used inside RadioGroup');
  return ctx;
}

export interface RadioGroupProps {
  value: string;
  onChange: (value: string) => void;
  name?: string;
  orientation?: RadioOrientation;
  disabled?: boolean;
  'aria-label'?: string;
  className?: string;
  children: ReactNode;
}

export function RadioGroup({
  value,
  onChange,
  name,
  orientation = 'column',
  disabled = false,
  'aria-label': ariaLabel,
  className,
  children,
}: RadioGroupProps) {
  const generatedName = useId();
  const groupName = name ?? generatedName;

  return (
    <RadioGroupContext.Provider value={{ name: groupName, value, onChange, disabled }}>
      <div
        className={['nb-radio-group', `nb-radio-group--${orientation}`, className]
          .filter(Boolean)
          .join(' ')}
        role="radiogroup"
        aria-label={ariaLabel}
      >
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

export interface RadioProps {
  value: string;
  label?: ReactNode;
  disabled?: boolean;
  'aria-label'?: string;
  className?: string;
}

export function Radio({
  value,
  label,
  disabled = false,
  'aria-label': ariaLabel,
  className,
}: RadioProps) {
  const group = useRadioGroup();
  const id = useId();
  const isDisabled = disabled || group.disabled;
  const checked = group.value === value;

  return (
    <label
      htmlFor={id}
      className={['nb-choice', isDisabled && 'nb-choice--disabled', className]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="nb-choice__control">
        <input
          id={id}
          type="radio"
          name={group.name}
          value={value}
          checked={checked}
          disabled={isDisabled}
          aria-label={!label ? ariaLabel : undefined}
          onChange={() => group.onChange(value)}
        />
        <span className="nb-choice__mark nb-choice__mark--radio" aria-hidden="true" />
      </span>
      {label ? <span className="nb-choice__label">{label}</span> : null}
    </label>
  );
}
