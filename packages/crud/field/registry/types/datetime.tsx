import React from 'react';
import { DatePicker, DateRangePicker } from '@nubitio/ui';
import { getCoreLocale } from '@nubitio/core';
import type { FieldTypeModule } from '../FieldTypeModule';
import { OperatorFilterCell } from '../filterHelpers';
import { renderDefaultInputControl } from '../controlHelpers';
import {
  DATE_OPERATORS,
  getDateEndOfDay,
  getDateStartOfDay,
  getDateTimeDisplay,
  KEEP,
  splitBetweenValue,
} from '../shared';

export const datetimeTypeModule: FieldTypeModule = {
  controlKind: 'datetime',
  formWidth: () => 'compact',
  defaultFilterOperator: '=',
  filterOperators: DATE_OPERATORS,
  // Filtering a DATETIME column by a date means "that whole day", so '='
  // expands to a start/end-of-day pair and 'between' bounds both edges.
  buildFilterTerms: (field, operator, value) => {
    if (operator === 'between') {
      const [start, end] = splitBetweenValue(value);
      return [
        ...(start ? [[field.name, '>=', getDateStartOfDay(start)]] : []),
        ...(end ? [[field.name, '<=', getDateEndOfDay(end)]] : []),
      ];
    }
    if (operator === '=') {
      return [
        [field.name, '>=', getDateStartOfDay(value)],
        [field.name, '<=', getDateEndOfDay(value)],
      ];
    }
    return [[field.name, operator, value]];
  },
  cellText: (_field, value) => getDateTimeDisplay(value),
  serializeFormValue: () => KEEP,
  serializeDetailValue: () => KEEP,
  ControlRender: (props) => renderDefaultInputControl(props, 'datetime-local'),
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
