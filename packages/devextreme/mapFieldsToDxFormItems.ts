import type { Field } from '@nubitio/crud';
import { FieldType } from '@nubitio/crud';

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

function resolveEditorType(field: Field): string {
  switch (field.type) {
    case FieldType.TEXT:
    case FieldType.PASSWORD:
      return 'dxTextBox';
    case FieldType.TEXTAREA:
      return 'dxTextArea';
    case FieldType.NUMBER:
    case FieldType.CURRENCY:
      return 'dxNumberBox';
    case FieldType.DATE:
      return 'dxDateBox';
    case FieldType.DATETIME:
      return 'dxDateBox';
    case FieldType.CHECKBOX:
      return 'dxCheckBox';
    case FieldType.SWITCH:
      return 'dxSwitch';
    case FieldType.SELECT:
    case FieldType.ENUM:
    case FieldType.ENTITY:
    case FieldType.RADIO:
    case FieldType.TAGS:
      return 'dxSelectBox';
    default:
      return 'dxTextBox';
  }
}

function resolveEditorOptions(field: Field): Record<string, unknown> {
  const options: Record<string, unknown> = {};

  if (field.type === FieldType.PASSWORD) {
    options.mode = 'password';
  }

  if (field.type === FieldType.TEXTAREA) {
    options.height = field.height ?? 96;
  }

  if (field.maxLength != null) {
    options.maxLength = field.maxLength;
  }

  if (
    field.type === FieldType.SELECT ||
    field.type === FieldType.ENUM ||
    field.type === FieldType.ENTITY ||
    field.type === FieldType.RADIO ||
    field.type === FieldType.TAGS
  ) {
    options.dataSource = field.data ?? [];
    options.displayExpr = field.textField || 'label';
    options.valueExpr = field.valueField || 'value';
    options.searchEnabled = field.searchEnabled;
  }

  if (field.format) {
    options.format = field.format;
  }

  if (field.precision > 0 && (field.type === FieldType.NUMBER || field.type === FieldType.CURRENCY)) {
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