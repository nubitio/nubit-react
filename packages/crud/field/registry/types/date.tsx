import React from 'react';
import { DatePicker, DateRangePicker } from '@nubitio/ui';
import { getCoreLocale, getCoreTimezone } from '@nubitio/core';
import type { FieldTypeModule } from '../FieldTypeModule';
import { inputValue } from '../../../form/fieldOptionSource';
import { OperatorFilterCell } from '../filterHelpers';
import {
  DATE_OPERATORS,
  getDateDisplay,
  isEmptyWireValue,
  KEEP,
  OMIT,
  set,
  splitBetweenValue,
} from '../shared';

export const dateTypeModule: FieldTypeModule = {
  controlKind: 'date',
  formWidth: () => 'compact',
  // Editor value is always a YYYY-MM-DD business date: API strings are
  // truncated, Date objects rendered in the core timezone, anything else nulled.
  normalizeFormValue: (_field, value) => {
    if (typeof value === 'string') return set(value.slice(0, 10));
    if (value instanceof Date) {
      return set(value.toLocaleDateString('en-CA', { timeZone: getCoreTimezone() }));
    }
    return set(null);
  },
  defaultFilterOperator: '=',
  filterOperators: DATE_OPERATORS,
  // 'between' expands to a >=/<= pair of plain business dates (no time bounds —
  // DATE columns hold no time component).
  buildFilterTerms: (field, operator, value) => {
    if (operator === 'between') {
      const [start, end] = splitBetweenValue(value);
      return [
        ...(start ? [[field.name, '>=', start]] : []),
        ...(end ? [[field.name, '<=', end]] : []),
      ];
    }
    return [[field.name, operator, value]];
  },
  cellText: (_field, value) => getDateDisplay(value),
  // DATE submits as a YYYY-MM-DD business date with no timezone conversion.
  serializeFormValue: (_field, value) => {
    if (isEmptyWireValue(value)) return OMIT;
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return KEEP;
    if (value instanceof Date) {
      return set(new Intl.DateTimeFormat('en-CA', { timeZone: getCoreTimezone() }).format(value));
    }
    return set(String(value).slice(0, 10));
  },
  serializeDetailValue: () => KEEP,
  ControlRender: ({ field, value, error, errorClass, disabled, readOnly, setFieldValue }) => (
    <DatePicker
      className={`nb-form__date-control${errorClass}`}
      disabled={disabled}
      id={`nb-form-${field.name}`}
      invalid={!!error}
      locale={getCoreLocale()}
      name={field.name}
      readOnly={readOnly}
      required={field.required}
      value={String(inputValue(value) ?? '')}
      onChange={(nextValue) => setFieldValue(field.name, nextValue)}
    />
  ),
  FilterCellRender: (cell) => {
    const isBetween = cell.operator === 'between';
    const [betweenStart, betweenEnd] = splitBetweenValue(cell.value);
    return (
      <OperatorFilterCell cell={cell} operators={DATE_OPERATORS} isBetween={isBetween}>
        {isBetween ? (
          <DateRangePicker
            className="nb-datagrid__filter-range"
            locale={getCoreLocale()}
            startValue={betweenStart}
            endValue={betweenEnd}
            ariaLabel={cell.t('grid.filterColumn', { column: cell.field.label })}
            onChange={cell.onBetweenInputChange}
          />
        ) : (
          <DatePicker
            className="nb-datagrid__filter-date"
            clearable={false}
            locale={getCoreLocale()}
            value={cell.value}
            ariaLabel={cell.t('grid.filterColumn', { column: cell.field.label })}
            onChange={cell.onInputChange}
          />
        )}
      </OperatorFilterCell>
    );
  },
};
