import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { logDevHint } from './devHint';
import type { Field } from '../field/Field';
import { FieldType } from '../field/FieldType';

function stubField(overrides: Partial<Field> = {}): Field {
  return {
    isIdentity: false,
    type: FieldType.TEXT,
    col: undefined,
    name: 'name',
    label: 'Name',
    width: undefined,
    height: null,
    minWidth: undefined,
    align: undefined,
    sortable: true,
    filterable: true,
    hideable: true,
    validators: [],
    url: undefined,
    loadOptions: [],
    filters: [],
    byKeyUrl: null,
    textField: '',
    valueField: '',
    valueType: 'string',
    format: '',
    selectedFilterOperation: undefined,
    filterValue: undefined,
    data: [],
    formatter: undefined,
    itemFormatter: undefined,
    visible: true,
    defaultValue: undefined,
    onChange: undefined,
    onSelect: undefined,
    onClick: undefined,
    readonly: false,
    disabled: false,
    hidden: false,
    required: false,
    precision: 0,
    accept: undefined,
    buttons: [],
    searchEnabled: false,
    searchExpr: null,
    helpText: undefined,
    contentRender: null,
    visibleOnForm: true,
    maxLength: undefined,
    multiple: false,
    sendAsString: false,
    mappingReason: 'rule-9 text (range=xsd:string)',
    ...overrides,
  };
}

describe('logDevHint', () => {
  const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);

  beforeEach(() => {
    info.mockClear();
    vi.stubGlobal('window', {
      location: { hostname: 'localhost' },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('logs mapping reasons and defineResource snippet', () => {
    logDevHint('/api/products', [stubField()], ['GET', 'POST']);

    expect(info).toHaveBeenCalledOnce();
    const message = String(info.mock.calls[0]?.[0]);
    expect(message).toContain('[SmartCRUD]');
    expect(message).toContain('Mapping (rule → x-crud)');
    expect(message).toContain('rule-9 text');
    expect(message).toContain("defineResource('/api/products'");
    expect(message).toContain('operations: [GET, POST]');
  });

  it('is a no-op outside local hostnames', () => {
    vi.stubGlobal('window', {
      location: { hostname: 'production.example.com' },
    });

    logDevHint('/api/products', [stubField()]);
    expect(info).not.toHaveBeenCalled();
  });
});