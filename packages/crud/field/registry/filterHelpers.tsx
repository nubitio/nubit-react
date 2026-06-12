import React from 'react';
import { AppDropdown } from '@nubitio/ui';
import type { FieldTranslator, FilterCellProps } from './FieldTypeModule';
import type { FilterOperator } from './FieldTypeModule';

export const FILTER_RESET_OPERATOR = '__reset_filter__';

export function getFilterOperatorLabel(value: string, t: FieldTranslator): string {
  switch (value) {
    case 'contains':
      return t('grid.filterOperator.contains');
    case 'notcontains':
      return t('grid.filterOperator.notcontains');
    case 'startswith':
      return t('grid.filterOperator.startswith');
    case '=':
      return t('grid.filterOperator.equals');
    case '<>':
      return t('grid.filterOperator.notEquals');
    case '>':
      return t('grid.filterOperator.greaterThan');
    case '>=':
      return t('grid.filterOperator.greaterOrEqual');
    case '<':
      return t('grid.filterOperator.lessThan');
    case '<=':
      return t('grid.filterOperator.lessOrEqual');
    case 'between':
      return t('grid.filterOperator.between');
    default:
      return value;
  }
}

export function getFilterOperatorIcon(value: string): string {
  switch (value) {
    case 'contains':
      return 'abc';
    case 'notcontains':
      return 'a̸bc';
    case 'startswith':
      return 'ab|';
    case '=':
      return '=';
    case '<>':
      return '≠';
    case 'between':
      return '↔';
    default:
      return value;
  }
}

/** The "all values" dropdown used by option-backed filter cells. */
export function FilterValueDropdown({
  id,
  value,
  options,
  placeholder,
  className,
  onChange,
}: {
  id: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  placeholder: string;
  className?: string;
  onChange: (value: string) => void;
}) {
  return (
    <AppDropdown
      id={id}
      value={value}
      options={[{ value: '', label: placeholder }, ...options]}
      onChange={onChange}
      variant="compact"
      showFieldLabel={false}
      placeholder={placeholder}
      className={className}
    />
  );
}

/**
 * The operator-dropdown shell shared by input-style filter cells: operator
 * selector (with a reset entry while a value is set), the type-specific value
 * editor as children, and the clear button.
 */
export function OperatorFilterCell({
  cell,
  operators,
  isBetween = false,
  children,
}: {
  cell: FilterCellProps;
  operators: FilterOperator[];
  isBetween?: boolean;
  children: React.ReactNode;
}) {
  const { field, operator, value, t, onClear, onOperatorChange } = cell;
  return (
    <div
      className={`nb-datagrid__filter-wrap${isBetween ? ' nb-datagrid__filter-wrap--between' : ''}`}
    >
      {operators.length > 1 ? (
        <AppDropdown
          id={`nb-datagrid-filter-op-${field.name}`}
          value={operator}
          options={[
            ...operators.map((op) => ({
              value: op.value,
              label: getFilterOperatorLabel(op.value, t),
              selectedLabel: op.label,
              iconText: getFilterOperatorIcon(op.value),
            })),
            ...(value
              ? [
                  {
                    value: FILTER_RESET_OPERATOR,
                    label: t('grid.filterOperator.reset'),
                    iconText: '⌕',
                  },
                ]
              : []),
          ]}
          onChange={(nextOperator) => {
            if (nextOperator === FILTER_RESET_OPERATOR) {
              onClear();
              return;
            }
            onOperatorChange(nextOperator);
          }}
          variant="compact"
          showFieldLabel={false}
          menuMinWidth={220}
          className="nb-datagrid__filter-operator"
        />
      ) : (
        <i className="ph ph-magnifying-glass nb-datagrid__filter-icon" aria-hidden="true" />
      )}
      {children}
      <button
        type="button"
        className={`nb-datagrid__filter-clear${value ? ' is-active' : ''}`}
        aria-label={t('grid.clearFilter')}
        tabIndex={value ? 0 : -1}
        onClick={onClear}
      >
        <i className="ph ph-x" aria-hidden="true" />
      </button>
    </div>
  );
}

/** Operator shell + plain input — the fallback filter cell for text-ish types. */
export function renderDefaultFilterCell(
  cell: FilterCellProps,
  operators: FilterOperator[],
  inputType: 'text' | 'number' = 'text',
): React.ReactNode {
  return (
    <OperatorFilterCell cell={cell} operators={operators}>
      <input
        type={inputType}
        className="nb-datagrid__filter-input"
        value={cell.value}
        aria-label={cell.t('grid.filterColumn', { column: cell.field.label })}
        onChange={(e) => cell.onInputChange(e.target.value)}
      />
    </OperatorFilterCell>
  );
}
