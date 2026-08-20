import type { DataRecord } from '@nubitio/core';
import type { ResourceToolbarAction } from '../crud/ResourceConfig';
import type { DataGridViewOptions } from './DataGridViewOptions';
import { getResolvedRowActions } from './gridToolbar';

interface NativeRowActionLabels {
  inlineEdit: string;
  edit: string;
  view: string;
  delete: string;
}

interface NativeRowActionContext {
  row: DataRecord;
  options: DataGridViewOptions;
  labels: NativeRowActionLabels;
  editable: boolean;
  deletable: boolean;
  rowInlineMode: boolean;
  canInlineEditMode: boolean;
  inlineEditing: boolean;
  startInlineEdit: () => void;
  emitEdit: () => void;
  requestDelete: () => void;
}

/** Resolves built-in and resource-defined actions in their display order. */
export function buildNativeRowActions({
  row,
  options,
  labels,
  editable,
  deletable,
  rowInlineMode,
  canInlineEditMode,
  inlineEditing,
  startInlineEdit,
  emitEdit,
  requestDelete,
}: NativeRowActionContext): ResourceToolbarAction[] {
  const actions: ResourceToolbarAction[] = [];

  if (options.allowEdit && editable && rowInlineMode && canInlineEditMode && !inlineEditing) {
    actions.push({
      text: labels.inlineEdit,
      icon: 'ph-pencil-simple',
      disabled: options.editDisabled,
      onClick: startInlineEdit,
    });
  }
  if (
    options.allowEdit &&
    editable &&
    !canInlineEditMode &&
    (options.onEdit || options.events?.EDIT)
  ) {
    actions.push({
      text: labels.edit,
      icon: 'ph-pencil-simple',
      disabled: options.editDisabled,
      onClick: options.onEdit ? () => options.onEdit?.(row) : emitEdit,
    });
  }
  if (options.allowView && options.onView) {
    actions.push({ text: labels.view, icon: 'ph-eye', onClick: () => options.onView?.(row) });
  }

  actions.push(...getResolvedRowActions(row, options.rowActions));

  if (options.allowDelete && deletable && (options.onDelete || options.events?.DELETE)) {
    actions.push({
      text: labels.delete,
      icon: 'ph-trash',
      type: 'danger',
      disabled: options.deleteDisabled,
      onClick: requestDelete,
    });
  }

  return actions;
}
