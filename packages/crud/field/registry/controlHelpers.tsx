import React from 'react';
import { inputValue } from '../../form/fieldOptionSource';
import type { DetailCellProps, FieldControlProps } from './FieldTypeModule';

const FIELD_BUTTON_ICONS: Record<string, string> = {
  search: 'ph ph-magnifying-glass',
  add: 'ph ph-plus',
  clear: 'ph ph-x',
};

function resolveButtonIcon(icon?: string): string {
  if (!icon) return 'ph ph-magnifying-glass';
  if (icon.startsWith('ph ')) return icon;
  if (icon.startsWith('ph-')) return `ph ${icon}`;
  return FIELD_BUTTON_ICONS[icon] ?? 'ph ph-magnifying-glass';
}

/**
 * The default text-ish form control: an `<input>` of the given HTML type,
 * wrapped in an input-group when the Field declares action buttons.
 */
export function renderDefaultInputControl(
  props: FieldControlProps,
  inputType: string = 'text',
): React.ReactNode {
  const { field, value, commonProps, setFieldValue, disabled, readOnly, ctx } = props;
  const inputControl = (
    <input
      {...commonProps}
      type={inputType}
      value={inputValue(value)}
      onChange={(event) => setFieldValue(field.name, event.target.value)}
    />
  );
  const fieldButtons = Array.isArray(field.buttons) ? field.buttons : [];
  if (fieldButtons.length === 0) return inputControl;

  const buttonFormApi = {
    getFieldValue: (name: string) => ctx.getFieldValue(name),
    setFieldValue,
  };
  return (
    <div className="nb-form__input-group">
      {inputControl}
      <div className="nb-form__input-actions">
        {fieldButtons.map((button, index) => {
          const buttonOptions = button.options ?? {};
          const buttonLabel =
            button.name === 'search'
              ? ctx.t('form.searchButton')
              : String(button.name ?? ctx.t('form.actionButton'));
          return (
            <button
              key={String(button.name ?? index)}
              type="button"
              className="nb-form__input-button"
              disabled={disabled || readOnly}
              aria-label={buttonLabel}
              title={buttonLabel}
              onClick={(event) => buttonOptions.onClick?.(event, buttonFormApi)}
            >
              <i className={resolveButtonIcon(buttonOptions.icon)} aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** The default inline detail-grid cell: a plain input of the given HTML type. */
export function renderDefaultDetailCell(
  cell: DetailCellProps,
  inputType: 'text' | 'number' = 'text',
): React.ReactNode {
  const { field, value, errorClass, allowUpdating, onChange } = cell;
  return (
    <input
      className={`nb-form__control${errorClass}`}
      value={inputValue(value)}
      readOnly={!allowUpdating || field.readonly}
      disabled={field.disabled}
      type={inputType}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
