import { FieldType } from '../field/FieldType';
import type { Field } from '../field/Field';
import {
  DRAWER_WIDTHS,
  parseDrawerWidthPx,
  resolveDrawerLayoutBucket,
  type CrudDrawerSize,
} from '../view/drawerSizes';

export type FormLayoutHint =
  | 'short'
  | 'medium'
  | 'long'
  | 'multiline'
  | 'fullWidth'
  | 'identity'
  | 'money'
  | 'date'
  | 'lookup'
  | 'upload'
  | 'detail';

export type FormPresentationMode = 'dialog' | 'drawer' | 'page';
/** @deprecated Use {@link CrudDrawerSize} from drawer size tokens instead. */
export type DrawerSize = CrudDrawerSize;
export type ColSpan = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface FormPresentationContext {
  presentationMode: FormPresentationMode;
  drawerWidth?: number | string;
  dialogWidth?: number;
  viewportWidth?: number;
  containerWidth?: number;
  hasTabs?: boolean;
  hasMasterDetail?: boolean;
}

export interface FieldColSpanContext extends FormPresentationContext {
  drawerSize?: CrudDrawerSize;
  avoidOrphanFields?: boolean;
}

const MOBILE_BREAKPOINT = 768;

const FULL_WIDTH_HINTS: ReadonlySet<FormLayoutHint> = new Set([
  'long',
  'multiline',
  'fullWidth',
  'upload',
  'detail',
]);

const SHORT_HINTS: ReadonlySet<FormLayoutHint> = new Set([
  'short',
  'identity',
  'money',
  'date',
  'lookup',
  'medium',
]);

const COMPACT_FIELD_TYPES: ReadonlySet<FieldType> = new Set([
  FieldType.DATE,
  FieldType.DATETIME,
  FieldType.NUMBER,
  FieldType.CURRENCY,
  FieldType.SELECT,
  FieldType.ENUM,
  FieldType.SWITCH,
  FieldType.CHECKBOX,
  FieldType.RADIO,
]);

/** Layout bucket derived from the effective drawer width. */
export function resolveDrawerSize(drawerWidth?: number | string): CrudDrawerSize {
  return resolveDrawerLayoutBucket(drawerWidth);
}

export function isMobileViewport(context: FieldColSpanContext): boolean {
  const width = context.viewportWidth ?? context.containerWidth;
  return width != null && width <= MOBILE_BREAKPOINT;
}

function isFullWidthFieldType(field: Field): boolean {
  return (
    field.type === FieldType.TEXTAREA
    || field.type === FieldType.HTML
    || field.type === FieldType.FILE
    || field.type === FieldType.TAGS
    || field.contentRender != null
  );
}

/**
 * Structural full-width signal — type, layout hint, or declared max length only.
 * No field-name or label heuristics (library stays domain-agnostic).
 */
export function isLongTextField(field: Field): boolean {
  if (isFullWidthFieldType(field)) {
    return true;
  }

  if (field.layoutHint && FULL_WIDTH_HINTS.has(field.layoutHint)) {
    return true;
  }

  if (field.type === FieldType.TEXT && field.maxLength != null && field.maxLength > 80) {
    return true;
  }

  return false;
}

/**
 * Structural compact-field signal — field type and explicit layout hints only.
 */
export function isShortField(field: Field): boolean {
  if (isLongTextField(field)) {
    return false;
  }

  if (field.layoutHint && SHORT_HINTS.has(field.layoutHint)) {
    return true;
  }

  if (COMPACT_FIELD_TYPES.has(field.type)) {
    return true;
  }

  if (field.type === FieldType.ENTITY) {
    return !field.multiple;
  }

  if (field.type === FieldType.TEXT || field.type === FieldType.PASSWORD) {
    return field.maxLength != null && field.maxLength <= 40;
  }

  return false;
}

function canUseHalfColumn(context: FieldColSpanContext): boolean {
  if (isMobileViewport(context)) return false;

  // Master-detail forms render in a narrow left panel (~332px), not full page width.
  if (context.hasMasterDetail) return false;

  if (context.presentationMode === 'page') {
    return true;
  }

  if (context.presentationMode === 'drawer') {
    const size = context.drawerSize ?? 'md';
    return size === 'lg' || size === 'xl';
  }

  if (context.presentationMode === 'dialog') {
    const dialogWidth = context.dialogWidth ?? 480;
    return dialogWidth >= DRAWER_WIDTHS.lg;
  }

  return false;
}

function resolveHeuristicColSpan(field: Field, context: FieldColSpanContext): ColSpan {
  if (field.forceFullWidth || isLongTextField(field)) {
    return 12;
  }

  if (field.minColSpan === 12 || field.preferredColSpan === 12) {
    return 12;
  }

  if (field.layoutHint) {
    if (FULL_WIDTH_HINTS.has(field.layoutHint)) return 12;
    if (SHORT_HINTS.has(field.layoutHint) && canUseHalfColumn(context)) {
      // minColSpan === 12 already returned above, so a short hint always fits half.
      return 6;
    }
  }

  if (!canUseHalfColumn(context)) {
    return 12;
  }

  if (field.preferredColSpan === 6 || field.minColSpan === 6) {
    return 6;
  }

  return isShortField(field) ? 6 : 12;
}

/**
 * Resolves the grid column span for a single field.
 * Explicit `field.col` always wins over heuristics.
 */
export function resolveFieldColSpan(field: Field, context: FieldColSpanContext): ColSpan {
  if (field.col != null) {
    return field.col;
  }

  if (isMobileViewport(context) || field.forceFullWidth) {
    return 12;
  }

  return resolveHeuristicColSpan(field, context);
}

function advanceRow(rowUsed: number, span: ColSpan): number {
  if (rowUsed + span > 12) {
    return span;
  }
  const next = rowUsed + span;
  return next === 12 ? 0 : next;
}

/**
 * Resolves spans for a field list and optionally expands a trailing half-column orphan.
 */
export function resolveFieldsColSpans(
  fields: Field[],
  context: FieldColSpanContext,
): Map<string, ColSpan> {
  const resolved = fields.map((field) => ({
    field,
    span: resolveFieldColSpan(field, context),
  }));

  if (context.avoidOrphanFields !== false && resolved.length > 0) {
    let rowUsed = 0;
    for (const item of resolved) {
      rowUsed = advanceRow(rowUsed, item.span);
    }
    if (rowUsed === 6) {
      resolved[resolved.length - 1].span = 12;
    }
  }

  return new Map(resolved.map((item) => [item.field.name, item.span]));
}

export function buildFieldColSpanContext(
  options: FormPresentationContext & { avoidOrphanFields?: boolean },
): FieldColSpanContext {
  return {
    presentationMode: options.presentationMode,
    drawerWidth: options.drawerWidth,
    drawerSize: resolveDrawerSize(options.drawerWidth),
    dialogWidth: options.dialogWidth,
    viewportWidth: options.viewportWidth,
    containerWidth: options.containerWidth,
    hasTabs: options.hasTabs,
    hasMasterDetail: options.hasMasterDetail,
    avoidOrphanFields: options.avoidOrphanFields,
  };
}