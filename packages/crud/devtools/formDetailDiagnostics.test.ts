import { describe, expect, it } from 'vitest';
import { resolveFormDetailDiagnostics } from './formDetailDiagnostics';
import type { Field } from '../field/Field';

const binding = {
  propertyName: 'lines',
  lineClass: 'InvoiceLine',
  reloadUrl: '/api/invoice_lines?invoice={id}',
};

const lineField = { name: 'quantity', type: 'number', label: 'Qty' } as Field;

describe('resolveFormDetailDiagnostics', () => {
  it('reports inferred line fields when x-embedded-lines metadata is present', () => {
    const result = resolveFormDetailDiagnostics(
      { propertyName: 'lines', allowAdding: true },
      { propertyName: 'lines', url: binding.reloadUrl, fields: [lineField] },
      [binding],
    );

    expect(result.active).toBe(true);
    expect(result.fieldSource).toBe('inferred');
    expect(result.propertyName).toBe('lines');
    expect(result.reloadUrl).toBe(binding.reloadUrl);
    expect(result.lineClass).toBe('InvoiceLine');
    expect(result.lineFieldCount).toBe(1);
  });

  it('reports manual when configured fields override inference', () => {
    const result = resolveFormDetailDiagnostics(
      { fields: [{ name: 'custom', type: 'text', label: 'Custom' } as never] },
      { fields: [lineField] },
      [binding],
    );

    expect(result.fieldSource).toBe('manual');
  });

  it('reports opt-out when inferFields is false', () => {
    const result = resolveFormDetailDiagnostics(
      { inferFields: false, propertyName: 'lines' },
      undefined,
      [binding],
    );

    expect(result.fieldSource).toBe('opt-out');
    expect(result.inferFieldsOptOut).toBe(true);
    expect(result.embeddedLinesCount).toBe(1);
  });

  it('reports none when no form detail is configured', () => {
    const result = resolveFormDetailDiagnostics(undefined, undefined, []);

    expect(result.active).toBe(false);
    expect(result.fieldSource).toBe('none');
    expect(result.lineFieldCount).toBe(0);
  });
});