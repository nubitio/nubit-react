import type { Field, FieldControlKind } from '@nubitio/crud';
import { getFieldTypeModule } from '@nubitio/crud';

export interface DxFormItemDef {
  dataField: string;
  label?: { text: string };
  editorType?: string;
  editorOptions?: Record<string, unknown>;
  colSpan?: number;
  visible?: boolean;
  isRequired?: boolean;
  helpText?: string;
}

const DX_EDITOR_BY_KIND: Record<FieldControlKind, string> = {
  text: 'dxTextBox',
  password: 'dxTextBox',
  textarea: 'dxTextArea',
  number: 'dxNumberBox',
  date: 'dxDateBox',
  datetime: 'dxDateBox',
  select: 'dxSelectBox',
  radio: 'dxSelectBox',
  switch: 'dxSwitch',
  checkbox: 'dxCheckBox',
  file: 'dxTextBox',
  tags: 'dxSelectBox',
  html: 'dxTextBox',
  none: 'dxTextBox',
};

const OPTION_LIST_KINDS: ReadonlySet<FieldControlKind> = new Set(['select', 'radio', 'tags']);

function controlKind(field: Field): FieldControlKind {
  return getFieldTypeModule(field.type).controlKind ?? 'text';
}

function resolveEditorType(field: Field): string {
  return DX_EDITOR_BY_KIND[controlKind(field)];
}

function resolveEditorOptions(field: Field): Record<string, unknown> {
  const kind = controlKind(field);
  const options: Record<string, unknown> = {};

  if (kind === 'password') {
    options.mode = 'password';
  }

  if (kind === 'textarea') {
    options.height = field.height ?? 96;
  }

  if (field.maxLength != null) {
    options.maxLength = field.maxLength;
  }

  if (OPTION_LIST_KINDS.has(kind)) {
    options.dataSource = field.data ?? [];
    options.displayExpr = field.textField || 'label';
    options.valueExpr = field.valueField || 'value';
    options.searchEnabled = field.searchEnabled;
  }

  if (field.format) {
    options.format = field.format;
  }

  if (field.precision > 0 && kind === 'number') {
    options.format = field.format || `#,##0.${'0'.repeat(field.precision)}`;
  }

  return options;
}

export function mapFieldsToDxFormItems(fields: Field[]): DxFormItemDef[] {
  return fields
    .filter((field) => !field.isIdentity && field.visibleOnForm && !field.hidden)
    .sort(
      (left, right) =>
        (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER),
    )
    .map((field) => ({
      dataField: field.name,
      label: { text: field.label || field.name },
      editorType: resolveEditorType(field),
      editorOptions: resolveEditorOptions(field),
      colSpan: field.col,
      isRequired: field.required,
      helpText: field.helpText,
    }));
}
