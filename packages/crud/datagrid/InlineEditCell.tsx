import React from 'react';
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
}

/**
 * Renders a single cell as an editable control during inline row editing.
 * Uses the same FieldTypeModule.ControlRender path as the full form, but
 * with a compact common-props class so controls fit inside a table cell.
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
}: InlineEditCellProps) {
  const typeModule = getFieldTypeModule(field.type);
  const fieldError = errors?.[field.name];
  const errorClass = fieldError ? ' is-error' : '';

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
    <div className={`nb-inline-cell${errorClass ? ' nb-inline-cell--error' : ''}`}>
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
