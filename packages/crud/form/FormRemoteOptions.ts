import type { Field } from '../field/Field';
import { FieldType } from '../field/FieldType';

export interface FormRemoteOptions {
  url: string;
  valueField: string;
  textField: string;
  byKeyUrl: string | null;
  filters: Field['filters'];
  loadOptions: Field['loadOptions'];
  searchEnabled: boolean;
  searchExpr: string[] | null;
  multiple: boolean;
  autoSelectIfSingle: boolean;
  defaultValue: Field['defaultValue'];
  localData: Field['data'];
  iriMode: boolean;
}

export function getFormRemoteOptions(field: Field): FormRemoteOptions | null {
  if (field.type !== FieldType.ENTITY && field.type !== FieldType.TAGS) {
    return null;
  }

  return {
    url: field.url ?? '',
    valueField: field.valueField,
    textField: field.textField,
    byKeyUrl: field.byKeyUrl,
    filters: field.filters,
    loadOptions: field.loadOptions,
    searchEnabled: field.searchEnabled,
    searchExpr: field.searchExpr,
    multiple: field.multiple,
    autoSelectIfSingle: field.autoSelectIfSingle === true,
    defaultValue: field.defaultValue,
    localData: field.data,
    iriMode: field.valueField === '_iri',
  };
}
