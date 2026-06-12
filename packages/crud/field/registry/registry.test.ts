/**
 * Unit tests for the Field-Type registry — the deep seam that owns all
 * per-FieldType behaviour (see CONTEXT.md). Each module is tested through the
 * FieldTypeModule interface, which is exactly the surface the grid, form and
 * serializers consume.
 */
import { describe, expect, it } from 'vitest';
import { getCoreLocale } from '@nubitio/core';
import { FieldType } from '../FieldType';
import { getFieldTypeModule } from './registry';
import type { SerializeFieldContext } from './FieldTypeModule';
import { HydraAdapter } from '../../adapter/HydraAdapter';
import { textField, currencyField, numberField, dateField, entityField, enumField } from '../FieldBuilders';
import type { Field } from '../Field';

const ctx: SerializeFieldContext = { adapter: HydraAdapter };
const cellCtx = { yesLabel: 'Yes', noLabel: 'No' };

function entity(over: Partial<Field> = {}): Field {
  return { ...entityField('/api/categories', 'id', 'name').name('category').label('Category').build(), ...over };
}

describe('filter operators', () => {
  it('text-like types default to contains with the text operator set', () => {
    for (const type of [FieldType.TEXT, FieldType.PASSWORD, FieldType.TEXTAREA, FieldType.RADIO, FieldType.CHECKBOX, FieldType.FILE, FieldType.TAGS, FieldType.HTML, FieldType.NONE]) {
      const mod = getFieldTypeModule(type);
      expect(mod.defaultFilterOperator).toBe('contains');
      expect(mod.filterOperators.map((op) => op.value)).toEqual(['contains', 'notcontains', 'startswith', '=', '<>']);
    }
  });

  it('numeric types offer comparison operators and default to equals', () => {
    for (const type of [FieldType.NUMBER, FieldType.CURRENCY]) {
      const mod = getFieldTypeModule(type);
      expect(mod.defaultFilterOperator).toBe('=');
      expect(mod.filterOperators.map((op) => op.value)).toEqual(['=', '<>', '>', '>=', '<', '<=']);
    }
  });

  it('date types add between to the comparison operators', () => {
    for (const type of [FieldType.DATE, FieldType.DATETIME]) {
      const mod = getFieldTypeModule(type);
      expect(mod.defaultFilterOperator).toBe('=');
      expect(mod.filterOperators.map((op) => op.value)).toContain('between');
    }
  });

  it('option-backed types only offer equality', () => {
    for (const type of [FieldType.ENUM, FieldType.SELECT, FieldType.SWITCH, FieldType.ENTITY]) {
      const mod = getFieldTypeModule(type);
      expect(mod.defaultFilterOperator).toBe('=');
      expect(mod.filterOperators.map((op) => op.value)).toEqual(['=']);
    }
  });
});

describe('filter term expansion', () => {
  const dateF = dateField().name('soldOn').label('Sold').build();
  const datetimeF = { ...dateF, type: FieldType.DATETIME };

  it('expands a DATE between into a plain >=/<= pair', () => {
    expect(getFieldTypeModule(FieldType.DATE).buildFilterTerms(dateF, 'between', '2026-01-01|2026-01-31')).toEqual([
      ['soldOn', '>=', '2026-01-01'],
      ['soldOn', '<=', '2026-01-31'],
    ]);
  });

  it('drops missing edges of a DATE between', () => {
    expect(getFieldTypeModule(FieldType.DATE).buildFilterTerms(dateF, 'between', '|2026-01-31')).toEqual([
      ['soldOn', '<=', '2026-01-31'],
    ]);
  });

  it('expands a DATETIME equals into a whole-day range', () => {
    expect(getFieldTypeModule(FieldType.DATETIME).buildFilterTerms(datetimeF, '=', '2026-01-15')).toEqual([
      ['soldOn', '>=', '2026-01-15 00:00:00'],
      ['soldOn', '<=', '2026-01-15 23:59:59'],
    ]);
  });

  it('bounds a DATETIME between with day edges', () => {
    expect(getFieldTypeModule(FieldType.DATETIME).buildFilterTerms(datetimeF, 'between', '2026-01-01|2026-01-31')).toEqual([
      ['soldOn', '>=', '2026-01-01 00:00:00'],
      ['soldOn', '<=', '2026-01-31 23:59:59'],
    ]);
  });

  it('passes other types through as a single term', () => {
    const textF = textField().name('name').label('Name').build();
    expect(getFieldTypeModule(FieldType.TEXT).buildFilterTerms(textF, 'contains', 'abc')).toEqual([
      ['name', 'contains', 'abc'],
    ]);
  });
});

describe('cell text', () => {
  it('formats currency with two decimals', () => {
    const f = currencyField().name('price').label('Price').build();
    // Module formats via the core locale; compare against the same Intl output.
    const expected = (1234.5).toLocaleString(getCoreLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    expect(getFieldTypeModule(FieldType.CURRENCY).cellText(f, 1234.5, cellCtx)).toBe(expected);
  });

  it('renders booleans through the yes/no labels', () => {
    const f = textField().name('ok').label('OK').build();
    expect(getFieldTypeModule(FieldType.CHECKBOX).cellText(f, true, cellCtx)).toBe('Yes');
    expect(getFieldTypeModule(FieldType.CHECKBOX).cellText(f, false, cellCtx)).toBe('No');
  });

  it('resolves ENUM and SWITCH values through field.data', () => {
    const f = enumField([{ value: 'open', text: 'Open' }]).name('status').label('Status').build();
    expect(getFieldTypeModule(FieldType.ENUM).cellText(f, 'open', cellCtx)).toBe('Open');
    expect(getFieldTypeModule(FieldType.SWITCH).cellText(f, 'open', cellCtx)).toBe('Open');
  });

  it('keeps SELECT values raw (no field.data lookup)', () => {
    const f = enumField([{ value: 'open', text: 'Open' }]).name('status').label('Status').build();
    expect(getFieldTypeModule(FieldType.SELECT).cellText(f, 'open', cellCtx)).toBe('open');
  });

  it('shows entity display text from an object value', () => {
    const f = entity();
    expect(getFieldTypeModule(FieldType.ENTITY).cellText(f, { name: 'Books' }, cellCtx)).toBe('Books');
  });

  it('resolves an entity IRI through pre-loaded options', () => {
    const f = entity();
    const options = [{ '@id': '/api/categories/7', name: 'Books' }];
    expect(getFieldTypeModule(FieldType.ENTITY).cellText(f, '/api/categories/7', { ...cellCtx, entityOptions: options })).toBe('Books');
  });
});

describe('form value serialization', () => {
  it('DATE keeps YYYY-MM-DD strings and omits empties', () => {
    const f = dateField().name('soldOn').label('Sold').build();
    const mod = getFieldTypeModule(FieldType.DATE);
    expect(mod.serializeFormValue(f, '2026-05-02', ctx)).toEqual({ kind: 'keep' });
    expect(mod.serializeFormValue(f, '', ctx)).toEqual({ kind: 'omit' });
    expect(mod.serializeFormValue(f, '2026-05-02T10:00:00', ctx)).toEqual({ kind: 'set', value: '2026-05-02' });
  });

  it('NUMBER omits empties, coerces values, and never touches identity keys', () => {
    const f = numberField().name('qty').label('Qty').build();
    const mod = getFieldTypeModule(FieldType.NUMBER);
    expect(mod.serializeFormValue(f, '', ctx)).toEqual({ kind: 'omit' });
    expect(mod.serializeFormValue(f, '4', ctx)).toEqual({ kind: 'set', value: 4 });
    expect(mod.serializeFormValue({ ...f, isIdentity: true }, 'uuid-1', ctx)).toEqual({ kind: 'keep' });
  });

  it('CURRENCY serializes sendAsString values as fixed-point strings', () => {
    const f = currencyField().name('price').label('Price').build();
    expect(getFieldTypeModule(FieldType.CURRENCY).serializeFormValue(f, '12.3', ctx)).toEqual({ kind: 'set', value: '12.30' });
  });

  it('ENTITY resolves single refs and omits unresolvable ones', () => {
    const f = entity();
    const mod = getFieldTypeModule(FieldType.ENTITY);
    expect(mod.serializeFormValue(f, 5, ctx)).toEqual({ kind: 'set', value: '/api/categories/5' });
    expect(mod.serializeFormValue(f, null, ctx)).toEqual({ kind: 'omit' });
  });

  it('ENTITY with multiple wraps scalars and maps arrays', () => {
    const f = entity({ multiple: true });
    const mod = getFieldTypeModule(FieldType.ENTITY);
    expect(mod.serializeFormValue(f, [1, 2], ctx)).toEqual({
      kind: 'set',
      value: ['/api/categories/1', '/api/categories/2'],
    });
    expect(mod.serializeFormValue(f, 3, ctx)).toEqual({ kind: 'set', value: ['/api/categories/3'] });
    expect(mod.serializeFormValue(f, '', ctx)).toEqual({ kind: 'omit' });
  });

  it('NONE strips non-identity fields and keeps the identity', () => {
    const f = textField().name('display').label('Display').build();
    const mod = getFieldTypeModule(FieldType.NONE);
    expect(mod.serializeFormValue({ ...f, type: FieldType.NONE }, 'x', ctx)).toEqual({ kind: 'omit' });
    expect(mod.serializeFormValue({ ...f, type: FieldType.NONE, isIdentity: true }, 7, ctx)).toEqual({ kind: 'keep' });
  });

  it('FILE drops raw arrays in JSON mode and sends the first file in multipart mode', () => {
    const f = textField().name('doc').label('Doc').build();
    const mod = getFieldTypeModule(FieldType.FILE);
    expect(mod.serializeFormValue(f, ['raw'], ctx)).toEqual({ kind: 'omit' });
    expect(mod.serializeFormValue(f, '/api/media/1', ctx)).toEqual({ kind: 'keep' });
    const file = { name: 'a.pdf' };
    const multipart: SerializeFieldContext = { ...ctx, format: 'multipart', getFieldValue: () => [file] };
    expect(mod.serializeFormValue(f, undefined, multipart)).toEqual({ kind: 'set', value: file });
  });
});

describe('detail value serialization', () => {
  it('ENTITY always serializes a single ref in detail rows', () => {
    const f = entity({ multiple: true });
    expect(getFieldTypeModule(FieldType.ENTITY).serializeDetailValue(f, 5, HydraAdapter)).toEqual({
      kind: 'set',
      value: '/api/categories/5',
    });
  });

  it('NUMBER omits empty detail cells and coerces the rest', () => {
    const f = numberField().name('qty').label('Qty').build();
    const mod = getFieldTypeModule(FieldType.NUMBER);
    expect(mod.serializeDetailValue(f, '', HydraAdapter)).toEqual({ kind: 'omit' });
    expect(mod.serializeDetailValue(f, '2', HydraAdapter)).toEqual({ kind: 'set', value: 2 });
  });
});
