import { describe, expect, it } from 'vitest';

import { textField } from '../field/FieldBuilders';
import type { Field } from '../field/Field';
import type { ColumnGroupDef } from './ColumnGroup';
import {
  buildGroupBoundaryClassName,
  resolveColumnHeaders,
  resolveFieldGroupBoundaries,
} from './resolveColumnHeaders';

const field = (
  name: string,
  label: string,
  columnGroup?: string | string[],
): Field => ({
  ...textField().name(name).label(label).build(),
  ...(columnGroup !== undefined ? { columnGroup } : {}),
});

const GROUP_DEFS: ColumnGroupDef[] = [
  { key: 'entries', label: 'ENTRADAS' },
  { key: 'exits', label: 'SALIDAS' },
  { key: 'balance', label: 'SALDO' },
];

describe('resolveColumnHeaders', () => {
  it('returns flat headers when no field has columnGroup', () => {
    const result = resolveColumnHeaders([
      field('occurredAt', 'Fecha'),
      field('product', 'Producto'),
    ]);

    expect(result.groupDepth).toBe(0);
    expect(result.bandRows).toEqual([]);
    expect(result.leafRow).toEqual([]);
    expect(result.leafFields.map((f) => f.name)).toEqual(['occurredAt', 'product']);
  });

  it('builds one band row and a grouped leaf row', () => {
    const result = resolveColumnHeaders(
      [
        field('occurredAt', 'Fecha'),
        field('qtyIn', 'Cant.', 'entries'),
        field('unitCostIn', 'Costo unit.', 'entries'),
        field('qtyOut', 'Cant.', 'exits'),
        field('runningBalance', 'Cant.', 'balance'),
      ],
      GROUP_DEFS,
    );

    expect(result.groupDepth).toBe(1);
    expect(result.bandRows).toHaveLength(1);
    expect(result.bandRows[0]).toEqual([
      { kind: 'ungrouped', field: expect.objectContaining({ name: 'occurredAt' }), rowSpan: 2 },
      {
        kind: 'group',
        key: 'entries',
        label: 'ENTRADAS',
        colSpan: 2,
        align: 'center',
        className: undefined,
      },
      {
        kind: 'group',
        key: 'exits',
        label: 'SALIDAS',
        colSpan: 1,
        align: 'center',
        className: undefined,
      },
      {
        kind: 'group',
        key: 'balance',
        label: 'SALDO',
        colSpan: 1,
        align: 'center',
        className: undefined,
      },
    ]);
    expect(result.leafRow.map((cell) => (cell.kind === 'leaf' ? cell.field.name : null))).toEqual([
      'qtyIn',
      'unitCostIn',
      'qtyOut',
      'runningBalance',
    ]);
  });

  it('splits non-contiguous groups with the same key into separate bands', () => {
    const result = resolveColumnHeaders([
      field('qtyIn', 'Cant.', 'entries'),
      field('note', 'Nota'),
      field('unitCostIn', 'Costo unit.', 'entries'),
    ]);

    expect(result.bandRows[0]).toEqual([
      { kind: 'group', key: 'entries', label: 'Entries', colSpan: 1, align: 'center', className: undefined },
      { kind: 'ungrouped', field: expect.objectContaining({ name: 'note' }), rowSpan: 2 },
      { kind: 'group', key: 'entries', label: 'Entries', colSpan: 1, align: 'center', className: undefined },
    ]);
  });

  it('supports nested group paths', () => {
    const result = resolveColumnHeaders(
      [
        field('qtyIn', 'Cant.', ['valuation', 'entries']),
        field('qtyOut', 'Cant.', ['valuation', 'exits']),
      ],
      [
        { key: 'valuation', label: 'Valorización' },
        { key: 'entries', label: 'Entradas' },
        { key: 'exits', label: 'Salidas' },
      ],
    );

    expect(result.groupDepth).toBe(2);
    expect(result.bandRows).toHaveLength(2);
    expect(result.bandRows[0]).toEqual([
      {
        kind: 'group',
        key: 'valuation',
        label: 'Valorización',
        colSpan: 2,
        align: 'center',
        className: undefined,
      },
    ]);
    expect(result.bandRows[1]).toEqual([
      { kind: 'group', key: 'entries', label: 'Entradas', colSpan: 1, align: 'center', className: undefined },
      { kind: 'group', key: 'exits', label: 'Salidas', colSpan: 1, align: 'center', className: undefined },
    ]);
    expect(result.leafRow).toHaveLength(2);
  });
});

describe('resolveFieldGroupBoundaries', () => {
  it('marks dividers only between contiguous groups', () => {
    const boundaries = resolveFieldGroupBoundaries([
      field('occurredAt', 'Fecha', 'document'),
      field('movementType', 'Tipo', 'document'),
      field('qtyIn', 'Cant.', 'entries'),
      field('unitCostIn', 'Costo unit.', 'entries'),
      field('qtyOut', 'Cant.', 'exits'),
      field('runningBalance', 'Stock', 'balance'),
    ]);

    expect(boundaries.occurredAt).toEqual({
      groupKey: 'document',
      groupClassName: undefined,
      isGroupDivider: false,
    });
    expect(boundaries.movementType).toEqual({
      groupKey: 'document',
      groupClassName: undefined,
      isGroupDivider: true,
    });
    expect(boundaries.qtyIn).toEqual({
      groupKey: 'entries',
      groupClassName: undefined,
      isGroupDivider: false,
    });
    expect(boundaries.unitCostIn).toEqual({
      groupKey: 'entries',
      groupClassName: undefined,
      isGroupDivider: true,
    });
    expect(boundaries.runningBalance).toEqual({
      groupKey: 'balance',
      groupClassName: undefined,
      isGroupDivider: false,
    });
  });

  it('builds boundary class names for grouped columns', () => {
    const boundaries = resolveFieldGroupBoundaries(
      [field('qtyIn', 'Cant.', 'entries'), field('qtyOut', 'Cant.', 'exits')],
      [{ key: 'entries', label: 'ENTRADAS', className: 'nb-datagrid__group--in' }],
    );

    expect(buildGroupBoundaryClassName(boundaries.qtyIn)).toBe(
      'nb-datagrid__group--in nb-datagrid__col-group-divider',
    );
  });
});