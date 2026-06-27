import type { CSSProperties } from 'react';
import type { Field } from '../field/Field';

export const DETAIL_COL_WIDTH = 36;
export const CHECKBOX_COL_WIDTH = 36;
export const ACTIONS_COL_WIDTH = 44;
export const INLINE_ACTIONS_COL_WIDTH = 72;
export const DEFAULT_COL_WIDTH = 120;
export const MIN_COL_WIDTH = 48;

export function getColumnWidth(field: Field, colWidths: Record<string, number>): number {
  return colWidths[field.name] ?? field.width ?? field.minWidth ?? DEFAULT_COL_WIDTH;
}

/** Pin column width so band/leaf header rows stay aligned (each row is display:table). */
export function lockColumnWidth(width: number): CSSProperties {
  return { width, minWidth: width, maxWidth: width };
}

export function computeLayoutWidth({
  visibleFields,
  colWidths,
  hasCheckbox,
  hasDetail,
  hasRowActions,
  containerWidth,
  actionsColWidth = ACTIONS_COL_WIDTH,
}: {
  visibleFields: Field[];
  colWidths: Record<string, number>;
  hasCheckbox: boolean;
  hasDetail: boolean;
  hasRowActions: boolean;
  containerWidth: number;
  actionsColWidth?: number;
}): number {
  let total = 0;
  if (hasDetail) total += DETAIL_COL_WIDTH;
  if (hasCheckbox) total += CHECKBOX_COL_WIDTH;
  visibleFields.forEach((field) => {
    total += getColumnWidth(field, colWidths);
  });
  if (hasRowActions) total += actionsColWidth;
  return Math.max(containerWidth, total);
}

export function getPageRange(current: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  const result: (number | null)[] = [0];
  if (current > 3) result.push(null);
  for (let i = Math.max(1, current - 1); i <= Math.min(total - 2, current + 1); i++) result.push(i);
  if (current < total - 4) result.push(null);
  result.push(total - 1);
  return result;
}

export const PAGE_SIZE_OPTIONS = [10, 20, 50];