import { FieldType } from '../FieldType';
import type { FieldTypeModule } from './FieldTypeModule';
import { validateFieldTypeModule } from './validateFieldTypeModule';
import { checkboxTypeModule } from './types/checkbox';
import { currencyTypeModule } from './types/currency';
import { dateTypeModule } from './types/date';
import { datetimeTypeModule } from './types/datetime';
import { entityTypeModule } from './types/entity';
import { enumTypeModule } from './types/enum';
import { fileTypeModule } from './types/file';
import { htmlTypeModule } from './types/html';
import { noneTypeModule } from './types/none';
import { numberTypeModule } from './types/number';
import { passwordTypeModule } from './types/password';
import { radioTypeModule } from './types/radio';
import { selectTypeModule } from './types/select';
import { switchTypeModule } from './types/switch';
import { tagsTypeModule } from './types/tags';
import { textTypeModule } from './types/text';
import { textareaTypeModule } from './types/textarea';

/**
 * The Field-Type registry (see CONTEXT.md): FieldType → FieldTypeModule.
 *
 * Built-in types are closed; third parties register custom types via
 * {@link registerFieldType}. Per-field customization remains `Field.contentRender`.
 */
const FIELD_TYPE_MODULES: Record<FieldType, FieldTypeModule> = {
  [FieldType.NONE]: noneTypeModule,
  [FieldType.TEXT]: textTypeModule,
  [FieldType.PASSWORD]: passwordTypeModule,
  [FieldType.TEXTAREA]: textareaTypeModule,
  [FieldType.DATE]: dateTypeModule,
  [FieldType.DATETIME]: datetimeTypeModule,
  [FieldType.NUMBER]: numberTypeModule,
  [FieldType.CURRENCY]: currencyTypeModule,
  [FieldType.SELECT]: selectTypeModule,
  [FieldType.ENUM]: enumTypeModule,
  [FieldType.ENTITY]: entityTypeModule,
  [FieldType.RADIO]: radioTypeModule,
  [FieldType.SWITCH]: switchTypeModule,
  [FieldType.CHECKBOX]: checkboxTypeModule,
  [FieldType.FILE]: fileTypeModule,
  [FieldType.TAGS]: tagsTypeModule,
  [FieldType.HTML]: htmlTypeModule,
};

const CUSTOM_FIELD_TYPE_MODULES = new Map<string, FieldTypeModule>();

const BUILTIN_TYPE_VALUES = new Set<string>(Object.values(FieldType));

/**
 * Register a custom Field-Type module. Custom type ids must not collide with
 * built-in {@link FieldType} values.
 */
export function registerFieldType(type: string, module: FieldTypeModule): void {
  validateFieldTypeModule(type, module);

  if (BUILTIN_TYPE_VALUES.has(type)) {
    throw new Error(
      `registerFieldType("${type}"): cannot override a built-in FieldType. Use Field.contentRender instead.`,
    );
  }

  CUSTOM_FIELD_TYPE_MODULES.set(type, module);
}

/** Returns all registered custom type ids (for diagnostics). */
export function listRegisteredFieldTypes(): string[] {
  return [...CUSTOM_FIELD_TYPE_MODULES.keys()].sort();
}

export function getFieldTypeModule(type: FieldType | string): FieldTypeModule {
  if (type in FIELD_TYPE_MODULES) {
    return FIELD_TYPE_MODULES[type as FieldType];
  }

  return CUSTOM_FIELD_TYPE_MODULES.get(type) ?? textTypeModule;
}