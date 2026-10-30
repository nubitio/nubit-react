import { Select } from '@base-ui/react/select';
import { useId, useState, type ReactNode } from 'react';
import { useOverlayContainer } from './OverlayContainer';
import './AppDropdown.scss';

export interface AppDropdownOption {
  value: string;
  label: string;
  selectedLabel?: string;
  iconText?: string;
  disabled?: boolean;
}

export type AppDropdownVariant = 'form' | 'toolbar' | 'compact';

export interface AppDropdownProps {
  id?: string;
  ariaLabel?: string;
  label?: ReactNode;
  icon?: string;
  value: string;
  options: AppDropdownOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  variant?: AppDropdownVariant;
  className?: string;
  /** When true, wraps the control in a form-field label (form variant only). */
  showFieldLabel?: boolean;
  menuMinWidth?: number;
  error?: ReactNode;
  helpText?: ReactNode;
  menuHeader?: ReactNode;
  menuFooter?: ReactNode;
  onOpenChange?: (open: boolean) => void;
}

export function AppDropdown({
  id: idProp,
  ariaLabel,
  label,
  icon,
  value,
  options,
  onChange,
  disabled = false,
  placeholder = 'Seleccionar…',
  variant = 'form',
  className,
  showFieldLabel = variant === 'form',
  menuMinWidth,
  error,
  helpText,
  menuHeader,
  menuFooter,
  onOpenChange,
}: AppDropdownProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const container = useOverlayContainer();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  const labelled = !!label && (showFieldLabel || variant === 'toolbar');
  const message = error ?? helpText;
  const iconClass = icon?.startsWith('ph ')
    ? icon
    : icon?.startsWith('ph-')
      ? `ph ${icon}`
      : `ph ph-${icon}`;
  return (
    <Select.Root
      value={value}
      onValueChange={(next) => {
        if (next !== null) onChange(next);
      }}
      disabled={disabled}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        onOpenChange?.(next);
      }}
      modal={false}
    >
      <div className={showFieldLabel && variant !== 'toolbar' ? 'nb-form-field' : undefined}>
        {showFieldLabel && variant !== 'toolbar' && label && (
          <label className="nb-form-field__label" id={`${id}-label`} htmlFor={id}>
            {label}
          </label>
        )}
        <div
          className={[
            'nb-dropdown',
            `nb-dropdown--${variant}`,
            open && 'nb-dropdown--open',
            disabled && 'nb-dropdown--disabled',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {variant === 'toolbar' && label && (
            <span className="nb-dropdown__toolbar-label" id={`${id}-label`}>
              {icon && <i className={iconClass} aria-hidden="true" />}
              <span>{label}</span>
            </span>
          )}
          <Select.Trigger
            id={id}
            className="nb-dropdown__trigger"
            onKeyDownCapture={(event) => {
              if (open && event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                setOpen(false);
                onOpenChange?.(false);
              }
            }}
            aria-label={ariaLabel}
            aria-labelledby={
              ariaLabel ? undefined : labelled ? `${id}-label ${id}-value` : `${id}-value`
            }
            aria-describedby={message ? `${id}-message` : undefined}
            aria-invalid={!!error || undefined}
          >
            <span className="nb-dropdown__value" id={`${id}-value`}>
              {selected?.selectedLabel ?? selected?.label ?? placeholder}
            </span>
            <i className="ph ph-caret-down nb-dropdown__caret" aria-hidden="true" />
          </Select.Trigger>
          <Select.Portal container={container ?? undefined}>
            <Select.Positioner
              align="start"
              sideOffset={4}
              alignItemWithTrigger={false}
              className="nb-dropdown-positioner"
              style={{ minWidth: menuMinWidth }}
            >
              <Select.Popup
                onKeyDownCapture={(event) => {
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    event.stopPropagation();
                    setOpen(false);
                    onOpenChange?.(false);
                  }
                }}
                className={`nb-dropdown__menu nb-dropdown__menu--${variant}`}
              >
                {menuHeader}
                <Select.List className="nb-dropdown__menu-list">
                  {options.map((option) => (
                    <Select.Item
                      key={option.value}
                      value={option.value}
                      label={option.label}
                      disabled={option.disabled}
                      className={({ selected }) =>
                        `nb-dropdown__option${selected ? ' nb-dropdown__option--active' : ''}`
                      }
                    >
                      <Select.ItemText className="nb-dropdown__option-content">
                        {option.iconText && (
                          <span className="nb-dropdown__option-icon" aria-hidden="true">
                            {option.iconText}
                          </span>
                        )}
                        <span>{option.label}</span>
                      </Select.ItemText>
                      <Select.ItemIndicator className="nb-dropdown__selected" aria-hidden="true">
                        <i className="ph ph-check" />
                      </Select.ItemIndicator>
                    </Select.Item>
                  ))}
                </Select.List>
                {menuFooter}
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </div>
        {message && (
          <span
            id={`${id}-message`}
            className={error ? 'nb-form-field__error' : 'nb-form-field__help'}
            role={error ? 'alert' : undefined}
          >
            {message}
          </span>
        )}
      </div>
    </Select.Root>
  );
}
