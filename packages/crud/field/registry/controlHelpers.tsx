import React from 'react';
import { inputValue } from '../../form/fieldOptionSource';
import type { DetailCellProps, FieldControlProps } from './FieldTypeModule';
import { FieldInputActions } from './FieldInputActions';

/**
 * The default text-ish form control: an `<input>` of the given HTML type,
 * wrapped in an input-group when the Field declares action buttons.
 */
export function renderDefaultInputControl(
  props: FieldControlProps,
  inputType: string = 'text',
): React.ReactNode {
  const { field, value, commonProps, setFieldValue } = props;
  const inputControl = (
    <input
      {...commonProps}
      type={inputType}
      maxLength={field.maxLength}
      value={inputValue(value)}
      onChange={(event) => setFieldValue(field.name, event.target.value)}
    />
  );
  const fieldButtons = Array.isArray(field.buttons) ? field.buttons : [];
  if (fieldButtons.length === 0) return inputControl;

  return <FieldInputActions {...props}>{inputControl}</FieldInputActions>;
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
