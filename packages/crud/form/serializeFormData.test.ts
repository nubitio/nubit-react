import { describe, expect, it } from 'vitest';
import { serializeDetailRows, serializeFormFields } from './serializeFormData';
import { numberField, currencyField, textField } from '../field/FieldBuilders';

const ctx = { uploadedFiles: [] };

describe('serializeFormFields — numeric fields', () => {
  it('omits untouched (null) numerics instead of sending null', () => {
    const fields = [currencyField().name('price').build()];

    const out = serializeFormFields({ name: 'X', price: null }, fields, ctx);

    expect('price' in out).toBe(false);
    expect(out.name).toBe('X');
  });

  it('omits cleared (empty string) numerics instead of sending 0', () => {
    const fields = [numberField().name('qty').build()];

    const out = serializeFormFields({ qty: '' }, fields, ctx);

    expect('qty' in out).toBe(false);
  });

  it('serializes sendAsString numerics as fixed-point strings', () => {
    const fields = [currencyField().name('price').sendAsString(true).build()];

    const out = serializeFormFields({ price: '9.9' }, fields, ctx);

    expect(out.price).toBe('9.90');
  });

  it('coerces plain numerics to numbers', () => {
    const fields = [numberField().name('qty').build()];

    const out = serializeFormFields({ qty: '3' }, fields, ctx);

    expect(out.qty).toBe(3);
  });

  it('keeps zero — only empty values are omitted', () => {
    const fields = [numberField().name('qty').build()];

    const out = serializeFormFields({ qty: 0 }, fields, ctx);

    expect(out.qty).toBe(0);
  });

  it('leaves identity fields untouched', () => {
    const idField = { ...numberField().name('id').build(), isIdentity: true };

    const out = serializeFormFields({ id: 'uuid-1' }, [idField], ctx);

    expect(out.id).toBe('uuid-1');
  });

  it('does not invent keys for fields absent from the data', () => {
    const fields = [
      textField().name('name').build(),
      currencyField().name('price').build(),
    ];

    const out = serializeFormFields({ name: 'X' }, fields, ctx);

    expect('price' in out).toBe(false);
  });
});

describe('serializeDetailRows — numeric fields', () => {
  it('omits empty numerics per row and serializes the rest', () => {
    const fields = [currencyField().name('netAmount').sendAsString(true).build()];

    const rows = serializeDetailRows(
      [{ netAmount: null }, { netAmount: '12.5' }],
      fields,
      'id',
      false,
    );

    expect('netAmount' in rows[0]).toBe(false);
    expect(rows[1].netAmount).toBe('12.50');
  });
});
