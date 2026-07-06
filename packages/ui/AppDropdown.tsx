import { createPortal } from 'react-dom';
import { useId } from 'react';
import type { ReactNode } from 'react';
import { computeAnchoredStyle, useFloatingPanel } from './useFloatingPanel';
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

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

function normalizeIcon(icon?: string): string | undefined {
  if (!icon) return undefined;
  if (icon.startsWith('ph ')) return icon;
  if (icon.startsWith('ph-')) return `ph ${icon}`;
  return `ph ph-${icon}`;
}

export function AppDropdown({
  id: idProp,
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
  const {
    open,
    setOpen: setMenuOpen,
    openPanel: openMenu,
    containerRef,
    panelRef: menuRef,
    panelStyle: menuStyle,
  } = useFloatingPanel<HTMLDivElement, HTMLDivElement>({
    onOpenChange,
    dismissEvent: 'mousedown',
    closeOnViewportExit: true,
    computeStyle: (container) => {
      const trigger = container?.querySelector<HTMLElement>('.nb-dropdown__trigger') ?? container;
      return computeAnchoredStyle(trigger, {
        matchAnchorWidth: true,
        minWidth: menuMinWidth ?? 72,
      });
    },
  });
  const selected = options.find((option) => option.value === value);

  const control = (
    <div
      ref={containerRef}
      className={cx(
        'nb-dropdown',
        `nb-dropdown--${variant}`,
        open && 'nb-dropdown--open',
        disabled && 'nb-dropdown--disabled',
        className,
      )}
      role="group"
      aria-labelledby={label ? `${id}-label` : undefined}
    >
      {variant === 'toolbar' && label && (
        <span className="nb-dropdown__toolbar-label" id={`${id}-label`}>
          {icon && <i className={normalizeIcon(icon)} aria-hidden="true" />}
          <span>{label}</span>
        </span>
      )}
      <button
        type="button"
        className="nb-dropdown__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={label ? `${id}-label ${id}-value` : `${id}-value`}
        disabled={disabled}
        onClick={() => (open ? setMenuOpen(false) : openMenu())}
      >
        <span className="nb-dropdown__value" id={`${id}-value`}>
          {selected?.selectedLabel ?? selected?.label ?? placeholder}
        </span>
        <i className="ph ph-caret-down nb-dropdown__caret" aria-hidden="true" />
      </button>
      {open &&
        !disabled &&
        createPortal(
          <div
            ref={menuRef}
            className={cx('nb-dropdown__menu', `nb-dropdown__menu--${variant}`)}
            style={menuStyle}
          >
            {menuHeader}
            <ul
              role="listbox"
              aria-labelledby={label ? `${id}-label` : undefined}
              className="nb-dropdown__menu-list"
            >
            {options.map((option) => {
              const isActive = option.value === value;
              return (
                <li key={option.value} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    disabled={option.disabled}
                    className={cx(
                      'nb-dropdown__option',
                      isActive && 'nb-dropdown__option--active',
                    )}
                    onClick={() => {
                      if (option.disabled) return;
                      onChange(option.value);
                      setMenuOpen(false);
                    }}
                  >
                    <span className="nb-dropdown__option-content">
                      {option.iconText && (
                        <span className="nb-dropdown__option-icon" aria-hidden="true">
                          {option.iconText}
                        </span>
                      )}
                      <span>{option.label}</span>
                    </span>
                  </button>
                </li>
              );
            })}
            </ul>
            {menuFooter}
          </div>,
          document.body,
        )}
    </div>
  );

  if (!showFieldLabel || variant === 'toolbar') {
    return control;
  }

  return (
    <label className={cx('nb-form-field', !!error && 'nb-form-field--error')} htmlFor={id}>
      {label && (
        <span className="nb-form-field__label" id={`${id}-label`}>
          {label}
        </span>
      )}
      {control}
      {error ? (
        <span className="nb-form-field__error" role="alert">
          {error}
        </span>
      ) : helpText ? (
        <span className="nb-form-field__help">{helpText}</span>
      ) : null}
    </label>
  );
}
