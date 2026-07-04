import { describe, expect, it } from 'vitest';
import { FieldType, type Field } from '@nubitio/crud';

import {
  convertDxFilterToNubit,
  flattenDxFilter,
  mergeGridFilters,
} from './convertDxFilterToNubit';

const textField: Field = {
  name: 'name',
  label: 'Name',
  type: FieldType.TEXT,
  isIdentity: false,
  col: undefined,
  width: undefined,
  height: null,
  minWidth: undefined,
  align: undefined,
  sortable: true,
  filterable: true,
  hideable: true,
  validators: [],
  url: undefined,
  loadOptions: [],
  filters: [],
  byKeyUrl: null,
  textField: 'label',
  valueField: 'value',
  valueType: 'string',
  format: '',
  selectedFilterOperation: undefined,
  filterValue: undefined,
  data: [],
  formatter: undefined,
  itemFormatter: undefined,
  visible: true,
  defaultValue: undefined,
  onChange: undefined,
  onSelect: undefined,
  onClick: undefined,
  readonly: false,
  disabled: false,
  hidden: false,
  required: false,
  precision: 0,
  accept: undefined,
  buttons: [],
  searchEnabled: false,
  searchExpr: null,
  helpText: undefined,
  contentRender: undefined,
  visibleOnForm: true,
  maxLength: undefined,
  multiple: false,
  sendAsString: false,
};

const dateField: Field = {
  ...textField,
  name: 'createdAt',
  label: 'Created',
  type: FieldType.DATE,
  valueType: 'date',
};

describe('flattenDxFilter', () => {
  it('returns an empty array for nullish filters', () => {
    expect(flattenDxFilter(null)).toEqual([]);
    expect(flattenDxFilter(undefined)).toEqual([]);
  });

  it('flattens a simple triplet', () => {
    expect(flattenDxFilter(['name', 'contains', 'laptop'])).toEqual([
      ['name', 'contains', 'laptop'],
    ]);
  });

  it('flattens compound and-filters', () => {
    expect(
      flattenDxFilter([
        ['name', 'contains', 'laptop'],
        'and',
        ['active', '=', true],
      ]),
    ).toEqual([
      ['name', 'contains', 'laptop'],
      ['active', '=', true],
    ]);
  });
});

describe('convertDxFilterToNubit', () => {
  it('maps a text contains filter to a Nubit tuple', () => {
    expect(convertDxFilterToNubit(['name', 'contains', 'laptop'], [textField])).toEqual([
      ['name', 'contains', 'laptop'],
    ]);
  });

  it('expands date between filters into >= and <= pairs', () => {
    expect(
      convertDxFilterToNubit(
        ['createdAt', 'between', ['2026-01-01', '2026-01-31']],
        [dateField],
      ),
    ).toEqual([
      ['createdAt', '>=', '2026-01-01'],
      ['createdAt', '<=', '2026-01-31'],
    ]);
  });
});

describe('mergeGridFilters', () => {
  it('prepends routing filters before DevExtreme filters', () => {
    expect(
      mergeGridFilters(
        [{ field: 'status', operator: '=', value: 'open' }],
        ['name', 'contains', 'laptop'],
        [textField],
      ),
    ).toEqual([
      ['status', '=', 'open'],
      ['name', 'contains', 'laptop'],
    ]);
  });
});