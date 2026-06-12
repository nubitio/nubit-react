import { FieldType } from '../FieldType';
import type { FieldTypeModule } from './FieldTypeModule';
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
 * Internal to @nubitio/crud for now — not exported from public.ts. Per-field
 * customization goes through `Field.contentRender`/`Field.formatter`; a
 * `registerFieldType()` escape hatch can be added later without breaking
 * changes.
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

export function getFieldTypeModule(type: FieldType): FieldTypeModule {
  return FIELD_TYPE_MODULES[type] ?? textTypeModule;
}
