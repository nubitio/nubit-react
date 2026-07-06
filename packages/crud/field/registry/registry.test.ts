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
import type { NormalizeFieldContext, SerializeFieldContext } from './FieldTypeModule';
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

describe('control kind', () => {
  it('declares the semantic control category adapter backends map to widgets', () => {
    const expected: Record<string, string> = {
      [FieldType.TEXT]: 'text',
      [FieldType.PASSWORD]: 'password',
      [FieldType.TEXTAREA]: 'textarea',
      [FieldType.NUMBER]: 'number',
      [FieldType.CURRENCY]: 'number',
      [FieldType.DATE]: 'date',
      [FieldType.DATETIME]: 'datetime',
      [FieldType.SELECT]: 'select',
      [FieldType.ENUM]: 'select',
      [FieldType.ENTITY]: 'select',
      [FieldType.RADIO]: 'radio',
      [FieldType.SWITCH]: 'switch',
      [FieldType.CHECKBOX]: 'checkbox',
      [FieldType.FILE]: 'file',
      [FieldType.TAGS]: 'tags',
      [FieldType.HTML]: 'html',
      [FieldType.NONE]: 'none',
    };
    for (const [type, kind] of Object.entries(expected)) {
      expect(getFieldTypeModule(type).controlKind).toBe(kind);
    }
  });
});

describe('form width', () => {
  const width = (type: FieldType, over: Partial<Field> = {}) => {
    const f = { ...textField().name('f').label('F').build(), type, ...over };
    return getFieldTypeModule(type).formWidth?.(f) ?? 'auto';
  };

  it('multiline and upload controls always span the full row', () => {
    for (const type of [FieldType.TEXTAREA, FieldType.HTML, FieldType.FILE, FieldType.TAGS]) {
      expect(width(type)).toBe('full');
    }
  });

  it('option, date, numeric and toggle controls fit a half column', () => {
    for (const type of [FieldType.DATE, FieldType.DATETIME, FieldType.NUMBER, FieldType.CURRENCY, FieldType.SELECT, FieldType.ENUM, FieldType.SWITCH, FieldType.CHECKBOX, FieldType.RADIO]) {
      expect(width(type)).toBe('compact');
    }
  });

  it('ENTITY is compact only for single refs', () => {
    expect(getFieldTypeModule(FieldType.ENTITY).formWidth?.(entity())).toBe('compact');
    expect(getFieldTypeModule(FieldType.ENTITY).formWidth?.(entity({ multiple: true }))).toBe('auto');
  });

  it('TEXT width follows the declared max length', () => {
    expect(width(FieldType.TEXT, { maxLength: 100 })).toBe('full');
    expect(width(FieldType.TEXT, { maxLength: 30 })).toBe('compact');
    expect(width(FieldType.TEXT)).toBe('auto');
  });

  it('PASSWORD is compact only when short', () => {
    expect(width(FieldType.PASSWORD, { maxLength: 20 })).toBe('compact');
    expect(width(FieldType.PASSWORD)).toBe('auto');
  });
});

describe('form value normalization', () => {
  const normCtx = (prepends: Map<string, Record<string, unknown>[]> = new Map()): NormalizeFieldContext => ({
    adapter: HydraAdapter,
    prependEntityOption: (field, item) => {
      const existing = prepends.get(field.name) ?? [];
      prepends.set(field.name, [...existing, item]);
    },
    getPrependData: (field) => prepends.get(field.name),
  });

  it('FILE values are always omitted from the editor row', () => {
    const f = textField().name('doc').label('Doc').build();
    expect(getFieldTypeModule(FieldType.FILE).normalizeFormValue?.(f, '/api/media/1', normCtx())).toEqual({ kind: 'omit' });
  });

  it('PASSWORD values are always blanked', () => {
    const f = textField().name('pw').label('PW').build();
    expect(getFieldTypeModule(FieldType.PASSWORD).normalizeFormValue?.(f, '$hash', normCtx())).toEqual({ kind: 'set', value: '' });
  });

  it('DATE truncates strings, formats Date objects, and nulls the rest', () => {
    const f = dateField().name('soldOn').label('Sold').build();
    const mod = getFieldTypeModule(FieldType.DATE);
    expect(mod.normalizeFormValue?.(f, '2026-05-02T10:00:00', normCtx())).toEqual({ kind: 'set', value: '2026-05-02' });
    expect(mod.normalizeFormValue?.(f, 42, normCtx())).toEqual({ kind: 'set', value: null });
    const out = mod.normalizeFormValue?.(f, new Date('2026-05-02T12:00:00Z'), normCtx());
    expect(out?.kind).toBe('set');
    expect(String((out as { value: unknown }).value)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('ENTITY resolves objects to their key and registers them as options', () => {
    const prepends = new Map<string, Record<string, unknown>[]>();
    const f = entity();
    const out = getFieldTypeModule(FieldType.ENTITY).normalizeFormValue?.(
      f,
      { '@id': '/api/categories/7', id: 7, name: 'Books' },
      normCtx(prepends),
    );
    expect(out).toEqual({ kind: 'set', value: '7' });
    expect(prepends.get('category')).toEqual([{ '@id': '/api/categories/7', id: 7, name: 'Books' }]);
  });

  it('ENTITY falls back to the first known option when the value is unresolvable', () => {
    const prepends = new Map<string, Record<string, unknown>[]>([['category', [{ id: 3, name: 'Games' }]]]);
    const out = getFieldTypeModule(FieldType.ENTITY).normalizeFormValue?.(entity(), null, normCtx(prepends));
    expect(out).toEqual({ kind: 'set', value: { id: 3, name: 'Games' } });
  });
});

describe('detail value validation', () => {
  it('NUMBER and CURRENCY reject NaN in required cells and enforce range validators', () => {
    for (const type of [FieldType.NUMBER, FieldType.CURRENCY]) {
      const mod = getFieldTypeModule(type);
      const f = { ...numberField().name('qty').label('Qty').build(), type, required: true };
      expect(mod.validateDetailValue?.(f, 'abc')).toBe(false);
      expect(mod.validateDetailValue?.(f, '4')).toBe(true);

      const ranged = { ...f, validators: [{ type: 'range', options: { min: 1, max: 10 } }] } as Field;
      expect(mod.validateDetailValue?.(ranged, 0)).toBe(false);
      expect(mod.validateDetailValue?.(ranged, 11)).toBe(false);
      expect(mod.validateDetailValue?.(ranged, 5)).toBe(true);
    }
  });

  it('other types leave detail cells to the generic required check', () => {
    expect(getFieldTypeModule(FieldType.TEXT).validateDetailValue).toBeUndefined();
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
