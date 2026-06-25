import type { Field } from '../field/Field';

export interface ColumnGroupDef {
  /** Stable id — matches a segment in `field.columnGroup`. */
  key: string;
  /** Band label shown in the grouped header row. */
  label: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
  /** When true (default), omit the band if all child columns are hidden. */
  hideWhenEmpty?: boolean;
}

export type ColumnHeaderCell =
  | {
      kind: 'ungrouped';
      field: Field;
      rowSpan: number;
    }
  | {
      kind: 'group';
      key: string;
      label: string;
      colSpan: number;
      align: 'left' | 'center' | 'right';
      className?: string;
    }
  | {
      kind: 'leaf';
      field: Field;
    };

export interface ResolvedColumnHeaders {
  /** Number of band rows above the leaf header row. 0 = flat single-row headers. */
  groupDepth: number;
  /** Band rows from outermost to innermost. Empty when `groupDepth` is 0. */
  bandRows: ColumnHeaderCell[][];
  /** Leaf headers for grouped columns only. Empty when `groupDepth` is 0. */
  leafRow: ColumnHeaderCell[];
  leafFields: Field[];
}