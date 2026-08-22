import { getCoreTimezone } from '@nubitio/core';
import { BaseFieldBuilder } from './BaseFieldBuilder';
import { FieldType } from './FieldType';
import type { DataRecord } from '@nubitio/core';
import type { Field } from './Field';

/**
 * Factory for the standard hidden identity field (type NONE, name 'id').
 *
 * Usage:
 *   identityField().build()
 *   identityField().required(true).build()
 *   identityField().valueType('number').build()
 *
 * Defaults set automatically:
 *   isIdentity(true), visible(false), required(true), name('id'), label('Id')
 */
class IdentityFieldBuilder extends BaseFieldBuilder<DataRecord> {
  constructor() {
    super(FieldType.NONE);
    this._field.isIdentity = true;
    this._field.visible = false;
    this._field.required = true;
    this._field.name = 'id';
    this._field.label = 'Id';
  }
}

export function identityField(): IdentityFieldBuilder {
  return new IdentityFieldBuilder();
}

/**
 * Builder for ENTITY (remote select) fields.
 *
 * Required constructor args: url, valueField, textField — the three properties
 * that are ALWAYS present on every ENTITY field in the codebase.
 *
 * Usage:
 *   new EntityFieldBuilder('customers', 'id', 'businessName')
 *     .label('Cliente')
 *     .name('customer')
 *     .formatter(cell => cell.value?.businessName)
 *     .build()
 */
export class EntityFieldBuilder<
  TRecord extends DataRecord = DataRecord,
> extends BaseFieldBuilder<TRecord> {
  constructor(url: string, valueField: string, textField: string) {
    super(FieldType.ENTITY);
    this._field.url = url;
    this._field.valueField = valueField;
    this._field.textField = textField;
  }
}

export function entityField<TRecord extends DataRecord = DataRecord>(
  url: string,
  valueField: string,
  textField: string,
): EntityFieldBuilder<TRecord> {
  return new EntityFieldBuilder<TRecord>(url, valueField, textField);
}

/**
 * Builder for TAGS (multi-select remote) fields.
 *
 * Same three required args as {@link entityField} — url, valueField,
 * textField — because a TAGS field IS an entity relation, just a to-many one:
 * it loads options from the same kind of remote resource and serializes the
 * same way (`serializeEntityFormValue`), the only difference is the control
 * renders a multi-select and the value is an array. Defaults `multiple(true)`
 * since that's what the ENTITY field type's `multiple` flag is defined
 * against (see `entityTypeModule` — an ENTITY field with `multiple: true`
 * falls back to a plain input; TAGS is the control that actually implements
 * multi-select).
 *
 * Usage:
 *   tagsField('/api/existencias', '_iri', 'peso')
 *     .name('existencias')
 *     .label('Existencias seleccionadas')
 *     .build()
 */
export class TagsFieldBuilder<
  TRecord extends DataRecord = DataRecord,
> extends BaseFieldBuilder<TRecord> {
  constructor(url: string, valueField: string, textField: string) {
    super(FieldType.TAGS);
    this._field.url = url;
    this._field.valueField = valueField;
    this._field.textField = textField;
    this._field.multiple = true;
  }
}

export function tagsField<TRecord extends DataRecord = DataRecord>(
  url: string,
  valueField: string,
  textField: string,
): TagsFieldBuilder<TRecord> {
  return new TagsFieldBuilder<TRecord>(url, valueField, textField);
}

/**
 * Builder for CURRENCY fields.
 *
 * Defaults applied automatically:
 *   sendAsString(true), align('right')
 *
 * Usage:
 *   new CurrencyFieldBuilder()
 *     .name('grandTotal')
 *     .label('Total')
 *     .formatter(cell => NumberUtils.formatCurrency(cell.value, cell.data?.currency))
 *     .build()
 */
export class CurrencyFieldBuilder<
  TRecord extends DataRecord = DataRecord,
> extends BaseFieldBuilder<TRecord> {
  constructor() {
    super(FieldType.CURRENCY);
    this._field.sendAsString = true;
    this._field.align = 'right';
  }
}

export function currencyField<
  TRecord extends DataRecord = DataRecord,
>(): CurrencyFieldBuilder<TRecord> {
  return new CurrencyFieldBuilder<TRecord>();
}

/**
 * Builder for MONEY fields — exact amounts carrying their own currency.
 *
 * Prefer this over {@link CurrencyFieldBuilder} whenever the backend publishes
 * `x-crud.format: money`. CURRENCY is a number with two decimals; MONEY never
 * converts the amount to a JavaScript number at all, which is what keeps a
 * grid total equal to the total the database holds.
 *
 * Usage:
 *   moneyField().name('total').label('Total').currency('EUR').build()
 */
export class MoneyFieldBuilder<
  TRecord extends DataRecord = DataRecord,
> extends BaseFieldBuilder<TRecord> {
  constructor() {
    super(FieldType.MONEY);
    this._field.align = 'right';
  }

  /** Currency assumed while the value is still empty. */
  currency(code: string): this {
    this._field.currency = code.toUpperCase();
    return this;
  }

  /** Decimal places accepted while typing. Defaults to the value's own scale. */
  scale(places: number): this {
    this._field.scale = places;
    return this;
  }
}

export function moneyField<TRecord extends DataRecord = DataRecord>(): MoneyFieldBuilder<TRecord> {
  return new MoneyFieldBuilder<TRecord>();
}

/**
 * Factory for generic file upload fields (FILE type).
 *
 * Uploads immediately to apiBaseUrl+'media' and submits the returned Media IRI.
 * Use `.accept()` to restrict mime types or extensions.
 *
 * Usage:
 *   fileField('/api/')
 *     .name('attachment')
 *     .label('Adjunto')
 *     .accept('application/pdf')
 *     .build()
 */
class FileFieldBuilder<TRecord extends DataRecord = DataRecord> extends BaseFieldBuilder<TRecord> {
  constructor(apiBaseUrl: string) {
    super(FieldType.FILE);
    this._field.url = apiBaseUrl + 'media';
  }
}

export function fileField<TRecord extends DataRecord = DataRecord>(
  apiBaseUrl: string,
): FileFieldBuilder<TRecord> {
  return new FileFieldBuilder<TRecord>(apiBaseUrl);
}

/**
 * Preset for image uploads — shorthand over fileField with image defaults.
 *
 * Defaults: url=apiBaseUrl+'media', accept='image/*', align='center'
 */
class ImageFieldBuilder<TRecord extends DataRecord = DataRecord> extends FileFieldBuilder<TRecord> {
  constructor(apiBaseUrl: string) {
    super(apiBaseUrl);
    this._field.accept = 'image/*';
    this._field.align = 'center';
  }
}

export function imageField<TRecord extends DataRecord = DataRecord>(
  apiBaseUrl: string,
): ImageFieldBuilder<TRecord> {
  return new ImageFieldBuilder<TRecord>(apiBaseUrl);
}

/**
 * Builder for DATE fields.
 *
 * Defaults applied automatically:
 *   type = DATE, defaultValue = new Date()
 *
 * Usage:
 *   dateField()
 *     .name('issueDate')
 *     .label('Fecha')
 *     .formatter(cell => SharedUtils.dateFormatter(cell.value))
 *     .build()
 */
class DateFieldBuilder<TRecord extends DataRecord = DataRecord> extends BaseFieldBuilder<TRecord> {
  constructor() {
    super(FieldType.DATE);
    this._field.defaultValue = new Intl.DateTimeFormat('en-CA', {
      timeZone: getCoreTimezone(),
    }).format(new Date());
  }
}

export function dateField<TRecord extends DataRecord = DataRecord>(): DateFieldBuilder<TRecord> {
  return new DateFieldBuilder<TRecord>();
}

/**
 * Builder for DATETIME fields.
 *
 * Defaults applied automatically:
 *   type = DATETIME, defaultValue = new Date()
 *
 * Usage:
 *   datetimeField()
 *     .name('openedAt')
 *     .label('Apertura')
 *     .formatter(cell => SharedUtils.dateTimeFormatter(cell.value))
 *     .build()
 */
class DateTimeFieldBuilder<
  TRecord extends DataRecord = DataRecord,
> extends BaseFieldBuilder<TRecord> {
  constructor() {
    super(FieldType.DATETIME);
    this._field.defaultValue = new Date();
  }
}

export function datetimeField<
  TRecord extends DataRecord = DataRecord,
>(): DateTimeFieldBuilder<TRecord> {
  return new DateTimeFieldBuilder<TRecord>();
}

/**
 * Builder for NUMBER fields.
 *
 * Usage:
 *   numberField()
 *     .name('quantity')
 *     .label('Cantidad')
 *     .precision(2)
 *     .align('center')
 *     .build()
 */
class NumberFieldBuilder<
  TRecord extends DataRecord = DataRecord,
> extends BaseFieldBuilder<TRecord> {
  constructor() {
    super(FieldType.NUMBER);
  }
}

export function numberField<
  TRecord extends DataRecord = DataRecord,
>(): NumberFieldBuilder<TRecord> {
  return new NumberFieldBuilder<TRecord>();
}

/** A single option item for ENUM / SELECT fields. */
export type EnumOption = { value: string | number; text: string };

/**
 * Builder for ENUM (local select) fields.
 *
 * The options array is a required constructor arg — every ENUM field in the
 * codebase always provides it.
 *
 * Usage:
 *   enumField([
 *     { value: 'income', text: 'Ingreso' },
 *     { value: 'expense', text: 'Egreso' },
 *   ])
 *     .name('type')
 *     .label('Tipo')
 *     .formatter(cell => cell.value === 'income' ? 'Ingreso' : 'Egreso')
 *     .build()
 */
export class EnumFieldBuilder<
  TRecord extends DataRecord = DataRecord,
> extends BaseFieldBuilder<TRecord> {
  constructor(options: EnumOption[]) {
    super(FieldType.ENUM);
    this._field.data = options;
  }
}

export function enumField<TRecord extends DataRecord = DataRecord>(
  options: EnumOption[],
): EnumFieldBuilder<TRecord> {
  return new EnumFieldBuilder<TRecord>(options);
}

/**
 * Builder for TEXT (plain string input) fields.
 *
 * Usage:
 *   textField()
 *     .name('businessName')
 *     .label('Razón social')
 *     .required(true)
 *     .build()
 */
export class TextFieldBuilder<
  TRecord extends DataRecord = DataRecord,
> extends BaseFieldBuilder<TRecord> {
  constructor() {
    super(FieldType.TEXT);
  }
}

export function textField<TRecord extends DataRecord = DataRecord>(): TextFieldBuilder<TRecord> {
  return new TextFieldBuilder<TRecord>();
}

/**
 * Builder for TEXTAREA (multi-line text) fields.
 *
 * Usage:
 *   textareaField()
 *     .name('note')
 *     .label('Nota')
 *     .build()
 */
class TextareaFieldBuilder<
  TRecord extends DataRecord = DataRecord,
> extends BaseFieldBuilder<TRecord> {
  constructor() {
    super(FieldType.TEXTAREA);
  }
}

export function textareaField<
  TRecord extends DataRecord = DataRecord,
>(): TextareaFieldBuilder<TRecord> {
  return new TextareaFieldBuilder<TRecord>();
}

/**
 * Builder for NONE (display-only, no editor) fields.
 *
 * Usage:
 *   noneField()
 *     .name('status')
 *     .label('Status')
 *     .formatter(cell => statusFormatter(cell.value))
 *     .build()
 */
class NoneFieldBuilder<TRecord extends DataRecord = DataRecord> extends BaseFieldBuilder<TRecord> {
  constructor() {
    super(FieldType.NONE);
  }
}

export function noneField<TRecord extends DataRecord = DataRecord>(): NoneFieldBuilder<TRecord> {
  return new NoneFieldBuilder<TRecord>();
}

/**
 * Builder for SWITCH (boolean toggle) fields.
 *
 * Usage:
 *   switchField()
 *     .name('active')
 *     .label('Activo')
 *     .defaultValue(true)
 *     .formatter(SharedUtils.booleanFormatter)
 *     .build()
 */
class SwitchFieldBuilder<
  TRecord extends DataRecord = DataRecord,
> extends BaseFieldBuilder<TRecord> {
  constructor() {
    super(FieldType.SWITCH);
  }
}

export function switchField<
  TRecord extends DataRecord = DataRecord,
>(): SwitchFieldBuilder<TRecord> {
  return new SwitchFieldBuilder<TRecord>();
}

/**
 * Builder for SELECT (local dropdown, value+text pairs) fields.
 *
 * Usage:
 *   selectField()
 *     .name('currency')
 *     .label('Moneda')
 *     .data([{ value: 'PEN', text: 'Soles' }, { value: 'USD', text: 'Dólares' }])
 *     .build()
 */
class SelectFieldBuilder<
  TRecord extends DataRecord = DataRecord,
> extends BaseFieldBuilder<TRecord> {
  constructor() {
    super(FieldType.SELECT);
  }
}

export function selectField<
  TRecord extends DataRecord = DataRecord,
>(): SelectFieldBuilder<TRecord> {
  return new SelectFieldBuilder<TRecord>();
}

/**
 * Builder for CHECKBOX (boolean check) fields.
 *
 * Usage:
 *   checkboxField()
 *     .name('emitInvoice')
 *     .label('Emitir comprobante')
 *     .defaultValue(false)
 *     .build()
 */
class CheckboxFieldBuilder<
  TRecord extends DataRecord = DataRecord,
> extends BaseFieldBuilder<TRecord> {
  constructor() {
    super(FieldType.CHECKBOX);
  }
}

export function checkboxField<
  TRecord extends DataRecord = DataRecord,
>(): CheckboxFieldBuilder<TRecord> {
  return new CheckboxFieldBuilder<TRecord>();
}

/**
 * Builder for PASSWORD (masked text input) fields.
 *
 * Usage:
 *   passwordField()
 *     .name('password')
 *     .label('Contraseña')
 *     .required(true)
 *     .build()
 */
class PasswordFieldBuilder<
  TRecord extends DataRecord = DataRecord,
> extends BaseFieldBuilder<TRecord> {
  constructor() {
    super(FieldType.PASSWORD);
  }
}

export function passwordField<
  TRecord extends DataRecord = DataRecord,
>(): PasswordFieldBuilder<TRecord> {
  return new PasswordFieldBuilder<TRecord>();
}

export type { Field };
