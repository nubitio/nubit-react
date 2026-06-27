import type { Field } from '../field/Field';
import { FieldType } from '../field/FieldType';
import type { DataGridViewOptions } from './DataGridViewOptions';

export function normalizeIcon(icon?: string): string | undefined {
  if (!icon) return undefined;
  return icon.includes('ph ') || icon.startsWith('ph-') ? icon : `ph-${icon}`;
}

export function isDateLikeField(field: Field): boolean {
  return field.type === FieldType.DATE || field.type === FieldType.DATETIME;
}

export function isCellEditMode(editMode?: DataGridViewOptions['editMode']): boolean {
  return editMode === 'cell' || editMode === 'batch';
}

export function resolveInlineEditToolbar(
  editMode: DataGridViewOptions['editMode'] | undefined,
  inlineEditToolbar: DataGridViewOptions['inlineEditToolbar'],
): { save: boolean; revert: boolean } | null {
  if (inlineEditToolbar === false) return null;
  const defaultShow = isCellEditMode(editMode);
  if (inlineEditToolbar == null) {
    return defaultShow ? { save: true, revert: true } : null;
  }
  if (typeof inlineEditToolbar === 'boolean') {
    return inlineEditToolbar ? { save: true, revert: true } : null;
  }
  return {
    save: inlineEditToolbar.save !== false,
    revert: inlineEditToolbar.revert !== false,
  };
}