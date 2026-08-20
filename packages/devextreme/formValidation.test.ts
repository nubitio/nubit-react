import { describe, expect, it } from 'vitest';
import { textField } from '@nubitio/crud';
import type { ValidationRule } from '@nubitio/crud';
import { isEmptyValue, validateField, withDetailRowKeys } from './formValidation';

const t = ((key: string) => key) as Parameters<typeof validateField>[3];
const fieldWith = (validators: ValidationRule[] = []) =>
  textField().name('value').label('Value').validators(validators).build();

describe('DevExtreme form validation', () => {
  it('recognizes only empty form values', () => {
    expect([null, undefined, '', []].every(isEmptyValue)).toBe(true);
    expect([0, false, '0', ['']].some(isEmptyValue)).toBe(false);
  });

  it('preserves existing detail keys and generates missing ones', () => {
    const rows = withDetailRowKeys([{ id: 1, __rowKey: 'known' }, { id: 2 }]);
    expect(rows[0]).toEqual({ id: 1, __rowKey: 'known' });
    expect(rows[1]?.__rowKey).toEqual(expect.any(String));
    expect(rows[1]?.__rowKey).not.toBe('');
  });

  it('validates field-level and rule-level required values', () => {
    const required = textField().name('value').label('Value').required(true).build();
    expect(validateField(required, '', {}, t)).toBe('form.fieldRequired');
    expect(
      validateField(
        fieldWith([{ type: 'required', options: { message: 'Required' } }]),
        null,
        {},
        t,
      ),
    ).toBe('Required');
  });

  it('validates email, numeric, and pattern rules', () => {
    expect(validateField(fieldWith([{ type: 'email', options: {} }]), 'bad', {}, t)).toBe(
      'form.invalidEmail',
    );
    expect(validateField(fieldWith([{ type: 'numeric', options: {} }]), 'nope', {}, t)).toBe(
      'form.invalidNumeric',
    );
    expect(
      validateField(
        fieldWith([{ type: 'pattern', options: { pattern: '^NUB-' } }]),
        'OTHER',
        {},
        t,
      ),
    ).toBe('form.invalidPattern');
  });

  it('validates both string-length limits', () => {
    const field = fieldWith([{ type: 'stringLength', options: { min: 2, max: 4 } }]);
    expect(validateField(field, 'x', {}, t)).toBe('form.stringTooShort');
    expect(validateField(field, '12345', {}, t)).toBe('form.stringTooLong');
    expect(validateField(field, 'good', {}, t)).toBeNull();
  });

  it('validates both numeric range limits', () => {
    const field = fieldWith([{ type: 'range', options: { min: 2, max: 4 } }]);
    expect(validateField(field, 1, {}, t)).toBe('form.outOfRange');
    expect(validateField(field, 5, {}, t)).toBe('form.outOfRange');
    expect(validateField(field, 3, {}, t)).toBeNull();
  });

  it('passes form data to custom validators and respects custom messages', () => {
    const field = fieldWith([
      {
        type: 'custom',
        options: {
          validationCallback: ({ value, data }) => value === data.expected,
          message: 'Values differ',
        },
      },
    ]);
    expect(validateField(field, 'a', { expected: 'b' }, t)).toBe('Values differ');
    expect(validateField(field, 'a', { expected: 'a' }, t)).toBeNull();
  });
});
