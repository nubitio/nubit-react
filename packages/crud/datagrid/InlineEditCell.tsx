import React, { useEffect, useRef } from 'react';
import type { CoreHttpClient, DataRecord } from '@nubitio/core';
import type { Field } from '../field/Field';
import type { FieldControlCommonProps, FieldTranslator, FormControlContext } from '../field/registry/FieldTypeModule';
import { getFieldTypeModule } from '../field/registry/registry';

interface InlineEditCellProps {
  field: Field;
  rowKey: unknown;
  draft: DataRecord;
  onChange: (fieldName: string, value: unknown) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
  allRemoteOptions: Record<string, DataRecord[]>;
  httpClient: CoreHttpClient;
  t: FieldTranslator;
  autoFocus?: boolean;
}

const INLINE_EDIT_PORTAL_SELECTOR =
  '.nb-date-picker__panel, .nb-form__lookup-menu, .nb-dropdown__menu, .nb-datagrid__actions-popover';

function focusInlineControl(container: HTMLDivElement | null) {
  if (!container) return;
  const focusable = container.querySelector<HTMLElement>(
    'input:not([type="hidden"]):not([disabled]):not([readonly]), select:not([disabled]), textarea:not([disabled]), .nb-date-picker__input:not([readonly]), .nb-dropdown__trigger:not([disabled])',
  );
  focusable?.focus();
  if (focusable instanceof HTMLInputElement && focusable.type !== 'checkbox') {
    focusable.select();
  }
}

/**
 * Renders a single cell as an editable control during inline editing.
 * Uses the same FieldTypeModule.ControlRender path as the full form, with
 * compact styling so controls fit naturally inside a table cell.
 */
export function InlineEditCell({
  field,
  rowKey,
  draft,
  onChange,
  errors,
  disabled = false,
  allRemoteOptions,
  httpClient,
  t,
  autoFocus = true,
}: InlineEditCellProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const typeModule = getFieldTypeModule(field.type);
  const fieldError = errors?.[field.name];
  const errorClass = fieldError ? ' is-error' : '';

  useEffect(() => {
    if (!autoFocus) return;
    focusInlineControl(containerRef.current);
  }, [autoFocus, field.name, rowKey]);

  const commonProps: FieldControlCommonProps = {
    className: `nb-inline-control${errorClass}`,
    disabled,
    id: `iec-${String(rowKey)}-${field.name}`,
    name: field.name,
    onClick: undefined,
    readOnly: false,
    required: field.required,
  };

  const ctx: FormControlContext = {
    httpClient,
    t,
    remoteOptions: allRemoteOptions,
    getPrependData: () => undefined,
    getFieldValue: (name) => draft[name],
    getExistingMedia: () => null,
    clearExistingMedia: () => {},
    upsertUploadedFile: () => {},
  };

  return (
    <div
      ref={containerRef}
      className={`nb-inline-cell${errorClass ? ' nb-inline-cell--error' : ''}`}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
        }
      }}
      onMouseDown={(event) => {
        if ((event.target as HTMLElement).closest(INLINE_EDIT_PORTAL_SELECTOR)) return;
        event.stopPropagation();
      }}
      onClick={(event) => event.stopPropagation()}
    >
      {typeModule.ControlRender({
        field,
        value: draft[field.name],
        error: fieldError,
        errorClass,
        disabled,
        readOnly: false,
        commonProps,
        setFieldValue: onChange,
        ctx,
      })}
    </div>
  );
}

export { INLINE_EDIT_PORTAL_SELECTOR };