import type { Field } from '../field/Field';
import type { ColumnGroupDef, ColumnHeaderCell, ResolvedColumnHeaders } from './ColumnGroup';

type HeaderNode =
  | { type: 'ungrouped'; field: Field }
  | { type: 'leaf'; field: Field }
  | { type: 'group'; key: string; children: HeaderNode[] };

function normalizeColumnGroup(field: Field): string[] {
  if (!field.columnGroup) return [];
  return typeof field.columnGroup === 'string' ? [field.columnGroup] : [...field.columnGroup];
}

function humanizeGroupKey(key: string): string {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function resolveGroupLabel(key: string, defs?: ColumnGroupDef[]): string {
  return defs?.find((def) => def.key === key)?.label ?? humanizeGroupKey(key);
}

function resolveGroupAlign(key: string, defs?: ColumnGroupDef[]): 'left' | 'center' | 'right' {
  return defs?.find((def) => def.key === key)?.align ?? 'center';
}

function resolveGroupClassName(key: string, defs?: ColumnGroupDef[]): string | undefined {
  return defs?.find((def) => def.key === key)?.className;
}

function countLeaves(node: HeaderNode): number {
  if (node.type === 'ungrouped' || node.type === 'leaf') return 1;
  return node.children.reduce((sum, child) => sum + countLeaves(child), 0);
}

function buildHeaderTree(fields: Field[]): HeaderNode[] {
  const roots: HeaderNode[] = [];

  for (const field of fields) {
    const path = normalizeColumnGroup(field);
    if (path.length === 0) {
      roots.push({ type: 'ungrouped', field });
      continue;
    }

    let level = roots;
    for (let index = 0; index < path.length; index += 1) {
      const key = path[index]!;
      const last = level[level.length - 1];
      let group =
        last?.type === 'group' && last.key === key
          ? last
          : undefined;

      if (!group) {
        group = { type: 'group', key, children: [] };
        level.push(group);
      }

      if (index === path.length - 1) {
        group.children.push({ type: 'leaf', field });
      } else {
        level = group.children;
      }
    }
  }

  return roots;
}

function visitBandRow(
  nodes: HeaderNode[],
  targetLevel: number,
  currentLevel: number,
  cells: ColumnHeaderCell[],
  groupDefs: ColumnGroupDef[] | undefined,
  totalHeaderRows: number,
): void {
  for (const node of nodes) {
    if (node.type === 'ungrouped') {
      if (targetLevel === 0) {
        cells.push({ kind: 'ungrouped', field: node.field, rowSpan: totalHeaderRows });
      }
      continue;
    }

    if (node.type === 'leaf') {
      if (targetLevel === 0) {
        cells.push({ kind: 'ungrouped', field: node.field, rowSpan: totalHeaderRows });
      }
      continue;
    }

    if (currentLevel === targetLevel) {
      cells.push({
        kind: 'group',
        key: node.key,
        label: resolveGroupLabel(node.key, groupDefs),
        colSpan: countLeaves(node),
        align: resolveGroupAlign(node.key, groupDefs),
        className: resolveGroupClassName(node.key, groupDefs),
      });
      continue;
    }

    if (currentLevel < targetLevel) {
      visitBandRow(node.children, targetLevel, currentLevel + 1, cells, groupDefs, totalHeaderRows);
    }
  }
}

function collectGroupedLeafHeaders(nodes: HeaderNode[]): ColumnHeaderCell[] {
  const cells: ColumnHeaderCell[] = [];

  for (const node of nodes) {
    if (node.type === 'ungrouped') continue;
    if (node.type === 'leaf') {
      cells.push({ kind: 'leaf', field: node.field });
      continue;
    }
    cells.push(...collectGroupedLeafHeaders(node.children));
  }

  return cells;
}

export function resolveColumnHeaders(
  visibleFields: Field[],
  groupDefs?: ColumnGroupDef[],
): ResolvedColumnHeaders {
  const groupDepth = visibleFields.reduce((max, field) => {
    return Math.max(max, normalizeColumnGroup(field).length);
  }, 0);

  if (groupDepth === 0) {
    return {
      groupDepth: 0,
      bandRows: [],
      leafRow: [],
      leafFields: visibleFields,
    };
  }

  const tree = buildHeaderTree(visibleFields);
  const totalHeaderRows = groupDepth + 1;
  const bandRows: ColumnHeaderCell[][] = [];

  for (let level = 0; level < groupDepth; level += 1) {
    const row: ColumnHeaderCell[] = [];
    visitBandRow(tree, level, 0, row, groupDefs, totalHeaderRows);
    bandRows.push(row);
  }

  return {
    groupDepth,
    bandRows,
    leafRow: collectGroupedLeafHeaders(tree),
    leafFields: visibleFields,
  };
}