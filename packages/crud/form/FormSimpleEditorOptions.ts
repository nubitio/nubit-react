import type { Field } from '../field/Field';
import { FieldType } from '../field/FieldType';

export interface FormNumberFormatOptions {
  style: 'currency';
  currency: string;
}

export interface FormDateEditorOptions {
  type: 'date' | 'datetime';
  displayFormat: string;
  defaultValue: Date;
  min?: unknown;
}

export interface FormFileEditorOptions {
  accept: string | null | undefined;
  uploadUrl?: string;
  selectButtonText: string;
}

export interface FormHtmlEditorOptions {
  height: number | null;
  value: Field['defaultValue'];
  toolbarItems: string[];
}

export interface FormSelectEditorOptions {
  dataSource: Field['data'];
  valueExpr: string;
  displayExpr: string;
}

export interface FormSimpleEditorOptions {
  select?: FormSelectEditorOptions;
  numberFormat?: FormNumberFormatOptions;
  checkboxText?: string;
  date?: FormDateEditorOptions;
  password?: boolean;
  file?: FormFileEditorOptions;
  html?: FormHtmlEditorOptions;
  switchHint?: string;
}

export function getFormSimpleEditorOptions(field: Field): FormSimpleEditorOptions {
  switch (field.type) {
    case FieldType.CURRENCY:
      return {
        numberFormat: {
          style: 'currency',
          currency: 'PEN',
        },
      };
    case FieldType.DATE:
      return {
        date: {
          type: 'date',
          displayFormat: field.format || 'dd/MM/yyyy',
          defaultValue: new Date(),
          min: field.data?.[0]?.min,
        },
      };
    case FieldType.DATETIME:
      return {
        date: {
          type: 'datetime',
          displayFormat: field.format || 'dd/MM/yyyy HH:mm',
          defaultValue: new Date(),
        },
      };
    case FieldType.CHECKBOX:
      return {
        checkboxText: field.label,
      };
    case FieldType.PASSWORD:
      return {
        password: true,
      };
    case FieldType.FILE:
      return {
        file: {
          accept: field.accept,
          uploadUrl: field.url,
          selectButtonText: 'Seleccionar ' + field.label.toLowerCase(),
        },
      };
    case FieldType.HTML:
      return {
        html: {
          height: field.height,
          value: field.defaultValue,
          toolbarItems: [
            'bold',
            'italic',
            'underline',
            'strike',
            'separator',
            'alignLeft',
            'alignCenter',
            'alignRight',
            'alignJustify',
            'separator',
            'orderedList',
            'bulletList',
          ],
        },
      };
    case FieldType.SWITCH:
      return {
        switchHint: field.label,
      };
    case FieldType.ENUM:
    case FieldType.SELECT:
      return {
        select: {
          dataSource: field.data,
          valueExpr: 'value',
          displayExpr: 'text',
        },
      };
    default:
      return {};
  }
}
