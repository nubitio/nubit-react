import { describe, expect, it, vi } from 'vitest';
import { FieldType, type Field } from '@nubitio/crud';
import { fieldToCodeLine, renderFieldsModule, renderPageModule } from './fieldToCode';

function field(overrides: Partial<Field>): Field {
  return {
    name: 'name',
    label: 'Name',
    type: FieldType.TEXT,
    data: [],
    isIdentity: false,
    required: false,
    readonly: false,
    ...overrides,
  } as Field;
}

describe('fieldToCodeLine', () => {
  it('renders scalar constraints and safely quoted labels', () => {
    expect(
      fieldToCodeLine(
        field({
          name: 'amount',
          label: 'Customer "total"',
          type: FieldType.NUMBER,
          required: true,
          readonly: true,
          precision: 2,
        }),
      ),
    ).toBe(
      '    numberField().name(\'amount\').label("Customer \\"total\\"").required(true).readonly(true).precision(2).build(),',
    );
  });

  it('renders entity, enum, and media builder arguments', () => {
    expect(
      fieldToCodeLine(
        field({
          type: FieldType.ENTITY,
          url: '/api/customers',
          valueField: 'id',
          textField: 'name',
        }),
      ),
    ).toContain("entityField('/api/customers', 'id', 'name')");
    expect(
      fieldToCodeLine(field({ type: FieldType.ENUM, data: [{ value: 'new', text: 'New' }] })),
    ).toContain('enumField([{ value: "new", text: "New" }])');
    expect(fieldToCodeLine(field({ type: FieldType.FILE, url: undefined }))).toContain(
      "fileField('/api/media')",
    );
  });
});

describe('module renderers', () => {
  it('omits identity fields and imports each required builder once', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-19T12:00:00.000Z'));
    const output = renderFieldsModule('/api/products', [
      field({ name: 'id', isIdentity: true }),
      field({ name: 'name' }),
      field({ name: 'description', type: FieldType.TEXT }),
    ]);
    vi.useRealTimers();

    expect(output).toContain("import { defineResource, textField } from '@nubitio/react-admin';");
    expect(output).toContain('Ejected from /api/products — 2026-08-19T12:00:00.000Z');
    expect(output).not.toContain(".name('id')");
  });

  it('renders a named page with a quoted title', () => {
    const output = renderPageModule('ProductsPage', '/api/products', 'Product list');
    expect(output).toContain('export function ProductsPage()');
    expect(output).toContain('title: "Product list"');
  });
});
