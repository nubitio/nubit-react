import './LookupControls.scss';
import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { useCoreHttpClient, type DataRecord } from '@nubitio/core';
import { entityField } from '../field/FieldBuilders';
import type { FilterRule } from '../field/FilterRule';
import { NativeEntitySelect } from './LookupControls';

export interface EntityDropdownProps {
  url: string;
  id?: string;
  valueField?: string;
  textField?: string;
  label?: string;
  value?: string | null;
  onChange: (value: string | null, item?: DataRecord | null) => void;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  required?: boolean;
  className?: string;
  searchEnabled?: boolean;
  searchExpr?: string[];
  itemFormatter?: (item: unknown) => ReactNode;
  filters?: FilterRule[];
  placeholder?: string;
}

export function EntityDropdown({
  url,
  id,
  valueField = 'id',
  textField = 'name',
  label = '',
  value,
  onChange,
  disabled,
  invalid,
  describedBy,
  required,
  className = 'nb-form__control nb-entity-dropdown__control',
  searchEnabled = true,
  searchExpr,
  itemFormatter,
  filters = [],
  placeholder,
}: EntityDropdownProps) {
  const httpClient = useCoreHttpClient();

  const field = useMemo(() => {
    const builder = entityField(url, valueField, textField)
      .label(label || placeholder || 'Seleccionar')
      .name('_entityDropdown')
      .searchEnabled(searchEnabled);

    if (searchExpr) builder.searchExpr(searchExpr);
    if (itemFormatter) builder.itemFormatter(itemFormatter);
    if (filters.length > 0) builder.filters(filters);

    return builder.build();
  }, [
    filters,
    itemFormatter,
    label,
    placeholder,
    searchEnabled,
    searchExpr,
    textField,
    url,
    valueField,
  ]);

  return (
    <NativeEntitySelect
      id={id}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      invalid={invalid}
      describedBy={describedBy}
      required={required}
      field={field}
      httpClient={httpClient}
      options={[]}
      value={value ?? ''}
      onChange={(nextValue, item) => {
        onChange(nextValue != null && nextValue !== '' ? String(nextValue) : null, item ?? null);
      }}
    />
  );
}
