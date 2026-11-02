import './LookupControls.scss';
import { useCallback, useMemo, useRef } from 'react';
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

  // The field is the identity of the remote source, loader and loaded records
  // downstream. Callers commonly pass fresh-but-equal `searchExpr`/`filters` arrays
  // and inline formatters on every render; keying by value keeps the field stable so
  // an in-flight search is not cancelled and loaded records are not discarded.
  const searchExprKey = searchExpr?.join('\u0000');
  const filtersKey = JSON.stringify(filters);
  const hasFormatter = itemFormatter !== undefined;
  const formatterRef = useRef(itemFormatter);
  // eslint-disable-next-line react-hooks/refs -- keep the latest formatter without changing field identity
  formatterRef.current = itemFormatter;
  const formatItem = useCallback((item: unknown) => formatterRef.current?.(item), []);

  const field = useMemo(() => {
    const builder = entityField(url, valueField, textField)
      .label(label || placeholder || 'Seleccionar')
      .name('_entityDropdown')
      .searchEnabled(searchEnabled);

    if (searchExpr) builder.searchExpr(searchExpr);
    // formatItem reads the latest formatter lazily, when an option is rendered.
    // eslint-disable-next-line react-hooks/refs
    if (hasFormatter) builder.itemFormatter(formatItem);
    if (filters.length > 0) builder.filters(filters);

    return builder.build();
    // searchExpr and filters are tracked through their value keys on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filtersKey,
    formatItem,
    hasFormatter,
    label,
    placeholder,
    searchEnabled,
    searchExprKey,
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
