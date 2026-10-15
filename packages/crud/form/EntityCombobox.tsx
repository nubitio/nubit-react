import { useCallback, useEffect, useMemo, useState } from 'react';
import { Combobox, MultiSelect, type ComboboxOption, type ComboboxLoader } from '@nubitio/ui';
import { useCoreTranslation, type CoreHttpClient, type DataRecord } from '@nubitio/core';
import type { Field } from '../field/Field';
import { useResourceStoreFactory } from '../data/ResourceStore';
import type { FormDataRecord } from './FormDataSnapshot';
import {
  createRemoteSource,
  fieldKeyValue,
  fieldOptionNode,
  fieldSearchExpr,
  fieldTextValue,
} from './fieldOptionSource';

function mergeRecords(field: Field, ...groups: DataRecord[][]): DataRecord[] {
  const records = new Map<string, DataRecord>();
  for (const group of groups)
    for (const item of group) {
      const key = fieldKeyValue(field, item);
      if (key != null && key !== '') records.set(String(key), item);
    }
  return [...records.values()];
}

/** Shared relation editor for forms, detail cells and grid filters. */
export function NativeEntitySelect({
  className,
  disabled,
  field,
  httpClient,
  id,
  onChange,
  options,
  prependData,
  readOnly,
  required,
  value,
  multiple = field.multiple,
  invalid,
  describedBy,
}: {
  className: string;
  disabled?: boolean;
  field: Field;
  httpClient: CoreHttpClient;
  id?: string;
  onChange: (value: unknown, item?: DataRecord | null) => void;
  options: DataRecord[];
  prependData?: FormDataRecord[];
  readOnly?: boolean;
  required?: boolean;
  value: unknown;
  multiple?: boolean;
  invalid?: boolean;
  describedBy?: string;
}) {
  const { t } = useCoreTranslation();
  const factory = useResourceStoreFactory();
  // The UI pins selected records itself. Keeping client-side prepends out of
  // paged responses avoids counting them as server rows and skipping records.
  const source = useMemo(
    () =>
      createRemoteSource(
        {
          ...field,
          loadOptions: field.loadOptions.map(
            ({ prependData: _prepend, appendData: _append, ...option }) => option,
          ),
        },
        httpClient,
        factory,
      ),
    [field, httpClient, factory],
  );
  const [loaded, setLoaded] = useState<{ source: typeof source; records: DataRecord[] } | null>(
    null,
  );
  const values = multiple
    ? Array.isArray(value)
      ? value
      : []
    : value == null || value === ''
      ? []
      : [value];
  const keys = values.map((entry) =>
    typeof entry === 'object' && entry !== null ? fieldKeyValue(field, entry as DataRecord) : entry,
  );
  const objectRecords = values.filter(
    (entry): entry is DataRecord =>
      typeof entry === 'object' && entry !== null && !Array.isArray(entry),
  );
  const records = mergeRecords(
    field,
    options,
    prependData ?? [],
    objectRecords,
    loaded?.source === source ? loaded.records : [],
  );
  const missing = keys.filter(
    (key) =>
      key != null &&
      !records.some((record) => String(fieldKeyValue(field, record)) === String(key)),
  );
  const missingKey = JSON.stringify(missing);

  useEffect(() => {
    if (!field.url || !source.byKey || missingKey === '[]') return;
    let cancelled = false;
    const keysToLoad = JSON.parse(missingKey) as unknown[];
    void Promise.all(keysToLoad.map((key) => source.byKey!(key).catch(() => null))).then(
      (items) => {
        if (cancelled) return;
        const found = items.filter((item): item is DataRecord => item !== null);
        if (found.length)
          setLoaded((previous) => ({
            source,
            records: mergeRecords(
              field,
              previous?.source === source ? previous.records : [],
              found,
            ),
          }));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [field, source, missingKey]);

  const toOption = useCallback(
    (item: DataRecord): ComboboxOption => ({
      value: String(fieldKeyValue(field, item)),
      label: fieldTextValue(field, item) || String(fieldKeyValue(field, item)),
      content: fieldOptionNode(field, item),
    }),
    [field],
  );

  const loadOptions = useCallback<ComboboxLoader>(
    async (query, { signal, cursor }) => {
      const skip = cursor === undefined ? 0 : Number(cursor);
      const result = await source.load({
        take: 50,
        skip,
        searchExpr: fieldSearchExpr(field),
        searchValue: field.searchEnabled && query !== '' ? query : undefined,
        signal,
      });
      if (signal.aborted) throw new DOMException('Search cancelled', 'AbortError');
      setLoaded((previous) => ({
        source,
        records: mergeRecords(
          field,
          previous?.source === source ? previous.records : [],
          result.data,
        ),
      }));
      const hasMore =
        result.data.length === 50 &&
        (result.totalCount === undefined || skip + result.data.length < result.totalCount);
      return {
        options: result.data.map(toOption),
        nextCursor: hasMore ? skip + result.data.length : null,
      };
    },
    [source, field, toOption],
  );

  const optionRecords = records.map(toOption);
  const resolveKey = (key: string) => {
    const record = records.find((item) => String(fieldKeyValue(field, item)) === key);
    return {
      key: record
        ? fieldKeyValue(field, record)
        : (keys.find((value) => String(value) === key) ?? key),
      record,
    };
  };
  const props = {
    id,
    name: field.name,
    options: optionRecords,
    inputClassName: className,
    disabled,
    readOnly,
    required,
    invalid,
    'aria-label': field.label,
    'aria-describedby': describedBy,
    openLabel: t('form.lookupOpen', { label: field.label }),
    clearLabel: t('form.lookupClear', { label: field.label }),
    emptyMessage: t('form.lookupNoResults'),
    loadingMessage: t('form.lookupSearching'),
    loadOptions: field.url && field.searchEnabled ? loadOptions : undefined,
  };
  if (multiple)
    return (
      <MultiSelect
        {...props}
        value={keys.filter((key) => key != null).map(String)}
        onChange={(selected) => onChange(selected.map((key) => resolveKey(key).key))}
      />
    );
  return (
    <Combobox
      {...props}
      value={keys[0] == null ? null : String(keys[0])}
      onChange={(key) => {
        const next = key === null ? null : resolveKey(key);
        onChange(next?.key ?? null, next?.record ?? null);
      }}
    />
  );
}
