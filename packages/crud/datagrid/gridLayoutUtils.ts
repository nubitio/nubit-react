import type { CSSProperties } from 'react';
import type { Field } from '../field/Field';

export const DETAIL_COL_WIDTH = 36;
export const CHECKBOX_COL_WIDTH = 36;
export const ACTIONS_COL_WIDTH = 44;
export const INLINE_ACTIONS_COL_WIDTH = 72;
export const DEFAULT_COL_WIDTH = 120;
export const MIN_COL_WIDTH = 48;

export function getColumnWidth(
  field: Field,
  colWidths: Record<string, number>,
  autoWidths?: Record<string, number>,
): number {
  return (
    colWidths[field.name] ??
    (typeof field.width === 'number' ? field.width : undefined) ??
    autoWidths?.[field.name] ??
    field.minWidth ??
    DEFAULT_COL_WIDTH
  );
}

// ── Content-driven auto width (DevExtreme-style columnAutoWidth) ──────────────
// Only applies to fields with no explicit `width` — those keep whatever the
// caller configured. For the rest, measure the header label and each loaded
// row's plain cell text (formatter fields are skipped: their rendered output
// isn't plain text, so canvas measurement can't see it) and size the column
// to its content instead of leaving it at the flat 120px default. Canvas
// text measurement is used instead of a hidden DOM probe because it's cheap
// enough to run over every row/column without layout thrash.

export const AUTO_WIDTH_MIN = MIN_COL_WIDTH;
export const AUTO_WIDTH_MAX = 360;
const AUTO_WIDTH_CELL_BUFFER = 28; // cell padding (both sides) + a little breathing room
const AUTO_WIDTH_HEADER_BUFFER = 40; // header padding + sort icon

let measureCanvasContext: CanvasRenderingContext2D | null | undefined;

function getMeasureContext(): CanvasRenderingContext2D | null {
  if (measureCanvasContext !== undefined) return measureCanvasContext;
  measureCanvasContext =
    typeof document === 'undefined' ? null : (document.createElement('canvas').getContext('2d') ?? null);
  return measureCanvasContext;
}

function measureTextWidth(ctx: CanvasRenderingContext2D, font: string, text: string): number {
  ctx.font = font;
  return ctx.measureText(text).width;
}

export function computeAutoColumnWidths<TRow extends Record<string, unknown>>({
  fields,
  rows,
  bodyFont,
  headerFont,
  getCellText,
}: {
  fields: Field[];
  rows: TRow[];
  bodyFont: string;
  headerFont: string;
  getCellText: (field: Field, row: TRow) => string;
}): Record<string, number> {
  const ctx = getMeasureContext();
  if (!ctx) return {};

  const result: Record<string, number> = {};
  for (const field of fields) {
    if (field.width !== undefined && field.width !== null) continue;
    if (field.formatter) continue;

    // Headers render uppercase with letter-spacing (see .nb-datagrid__table >
    // thead > tr > th) — uppercase the probe text so the measurement isn't
    // narrower than what's actually painted; AUTO_WIDTH_HEADER_BUFFER covers
    // the letter-spacing itself plus icon/padding.
    const headerWidth =
      measureTextWidth(ctx, headerFont, (field.label || field.name).toUpperCase()) +
      AUTO_WIDTH_HEADER_BUFFER;
    let maxBodyWidth = 0;
    for (const row of rows) {
      const text = getCellText(field, row);
      if (!text) continue;
      const width = measureTextWidth(ctx, bodyFont, text);
      if (width > maxBodyWidth) maxBodyWidth = width;
    }
    const bodyWidth = maxBodyWidth > 0 ? maxBodyWidth + AUTO_WIDTH_CELL_BUFFER : 0;

    const natural = Math.max(headerWidth, bodyWidth);
    if (natural <= 0) continue;
    result[field.name] = Math.min(AUTO_WIDTH_MAX, Math.max(AUTO_WIDTH_MIN, Math.ceil(natural)));
  }
  return result;
}

/** Pin column width so band/leaf header rows stay aligned (each row is display:table). */
export function lockColumnWidth(width: number): CSSProperties {
  return { width, minWidth: width, maxWidth: width };
}

export function computeLayoutWidth({
  visibleFields,
  colWidths,
  autoWidths,
  hasCheckbox,
  hasDetail,
  hasRowActions,
  containerWidth,
  actionsColWidth = ACTIONS_COL_WIDTH,
}: {
  visibleFields: Field[];
  colWidths: Record<string, number>;
  autoWidths?: Record<string, number>;
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
    total += getColumnWidth(field, colWidths, autoWidths);
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