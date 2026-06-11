import type { DataRecord } from '@nubitio/core';
import { BaseFieldBuilder } from './BaseFieldBuilder';
import type { Field } from './Field';

/**
 * A field definition as accepted by `ResourceConfig` arrays: either a built
 * `Field` object or a builder instance straight from `textField()`,
 * `entityField()`, etc. — calling `.build()` yourself is optional.
 */
export type FieldInput<TRecord extends DataRecord = DataRecord> =
  | Field
  | BaseFieldBuilder<TRecord>;

/** Normalizes a mixed array of Fields and builders into plain Fields. */
export function buildFields<TRecord extends DataRecord = DataRecord>(
  items: ReadonlyArray<FieldInput<TRecord>>,
): Field[] {
  return items.map((item) => (item instanceof BaseFieldBuilder ? item.build() : item));
}
