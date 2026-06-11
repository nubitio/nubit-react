import type { Field } from '../field/Field';
import { FieldType } from '../field/FieldType';

export type FormEditorKind =
  | 'text'
  | 'number'
  | 'date'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'textarea'
  | 'file'
  | 'switch'
  | 'tags'
  | 'html';

export function getFormEditorKind(field: Field): FormEditorKind | null {
  switch (field.type) {
    case FieldType.TEXT:
    case FieldType.PASSWORD:
      return 'text';
    case FieldType.NUMBER:
    case FieldType.CURRENCY:
      return 'number';
    case FieldType.DATE:
    case FieldType.DATETIME:
      return 'date';
    case FieldType.SELECT:
    case FieldType.ENUM:
    case FieldType.ENTITY:
      return 'select';
    case FieldType.CHECKBOX:
      return 'checkbox';
    case FieldType.RADIO:
      return 'radio';
    case FieldType.TEXTAREA:
      return 'textarea';
    case FieldType.FILE:
      return 'file';
    case FieldType.SWITCH:
      return 'switch';
    case FieldType.TAGS:
      return 'tags';
    case FieldType.HTML:
      return 'html';
    case FieldType.NONE:
      return null;
  }
}
