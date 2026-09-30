import { describe, expect, it } from 'vitest';
import {
  checkboxField,
  entityField,
  fileField,
  identityField,
  numberField,
  switchField,
  textField,
} from '../field/FieldBuilders';
import { validateDetailRows } from './FormDetailValidation';
import { getFormFieldPresentation } from './FormFieldPresentation';
import { getFormRemoteOptions } from './FormRemoteOptions';
import { syncComputedValuesIntoFormData } from './FormComputedValues';

describe('syncComputedValuesIntoFormData', () => {
  it('writes changed computed values and reports the change', () => {
    const result = syncComputedValuesIntoFormData({ qty: 2, total: 0 }, ['total'], { total: 20 });

    expect(result.changed).toBe(true);
    expect(result.nextFormData).toEqual({ qty: 2, total: 20 });
  });

  it('reports no change when the value is already current, and does not mutate the input', () => {
    const formData = { qty: 2, total: 20 };

    const result = syncComputedValuesIntoFormData(formData, ['total'], { total: 20 });

    expect(result.changed).toBe(false);
    expect(result.nextFormData).toEqual(formData);
    expect(result.nextFormData).not.toBe(formData);
  });

  it('clears a computed field the computation no longer produces', () => {
    const result = syncComputedValuesIntoFormData({ total: 20 }, ['total'], {});

    expect(result.changed).toBe(true);
    expect(result.nextFormData.total).toBeUndefined();
  });

  it('leaves fields that are not computed alone', () => {
    const result = syncComputedValuesIntoFormData({ qty: 2 }, [], { qty: 99 });

    expect(result).toEqual({ changed: false, nextFormData: { qty: 2 } });
  });
});

describe('getFormFieldPresentation', () => {
  it('hides the label of checkboxes and switches, which carry their own', () => {
    expect(getFormFieldPresentation(checkboxField().name('a').build())).toEqual({
      hideLabel: true,
      useFloatingLabel: false,
    });
    expect(getFormFieldPresentation(switchField().name('b').build()).hideLabel).toBe(true);
  });

  it('floats the label of ordinary inputs', () => {
    expect(getFormFieldPresentation(textField().name('c').build())).toEqual({
      hideLabel: false,
      useFloatingLabel: true,
    });
  });

  it('does not float the label above a file picker', () => {
    expect(getFormFieldPresentation(fileField('/api/').name('d').build())).toEqual({
      hideLabel: false,
      useFloatingLabel: false,
    });
  });
});

describe('getFormRemoteOptions', () => {
  it('is null for fields with no remote source', () => {
    expect(getFormRemoteOptions(textField().name('name').build())).toBeNull();
    expect(getFormRemoteOptions(numberField().name('qty').build())).toBeNull();
  });

  it('describes an entity lookup', () => {
    const options = getFormRemoteOptions(
      entityField('/api/categories', 'id', 'name').name('category').build(),
    );

    expect(options).toMatchObject({
      url: '/api/categories',
      textField: 'name',
      multiple: false,
      autoSelectIfSingle: false,
      iriMode: false,
    });
  });

  it('flags IRI mode when the value field is the resource IRI', () => {
    const options = getFormRemoteOptions(
      entityField('/api/categories', '_iri', 'name').name('category').build(),
    );

    expect(options?.iriMode).toBe(true);
  });
});

describe('validateDetailRows', () => {
  const fields = [
    identityField().build(),
    textField().name('sku').required(true).build(),
    numberField().name('qty').build(),
    textField().name('internal').required(true).hidden(true).build(),
  ];

  it('accepts rows whose required visible fields are filled', () => {
    expect(validateDetailRows([{ sku: 'A', qty: 1 }], fields)).toBe(true);
  });

  it.each([[undefined], [null], ['']])('rejects a row with a %s required value', (value) => {
    expect(validateDetailRows([{ sku: value, qty: 1 }], fields)).toBe(false);
  });

  it('ignores hidden and identity fields', () => {
    expect(validateDetailRows([{ sku: 'A' }], fields)).toBe(true);
  });

  it('fails as soon as any single row is invalid, and passes an empty list', () => {
    expect(validateDetailRows([{ sku: 'A' }, { sku: '' }], fields)).toBe(false);
    expect(validateDetailRows([], fields)).toBe(true);
  });
});
