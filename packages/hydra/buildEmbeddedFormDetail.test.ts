import { describe, expect, it } from 'vitest';
import { buildEmbeddedFormDetail } from './buildEmbeddedFormDetail';
import type { HydraResourceSchema } from './types';

const lineSchema: HydraResourceSchema = {
  className: 'InvoiceLine',
  apiUrl: '/api/invoice_lines',
  fields: [
    {
      name: 'quantity',
      propertyType: 'rdf:Property',
      required: true,
      readable: true,
      writeable: true,
      range: 'xsd:decimal',
    },
  ],
};

describe('buildEmbeddedFormDetail', () => {
  it('builds formDetail from x-embedded-lines binding and line schema', () => {
    const detail = buildEmbeddedFormDetail({
      binding: {
        propertyName: 'lines',
        lineClass: 'InvoiceLine',
        routePath: '/api/invoice_lines',
        parentQueryParam: 'invoice',
        reloadUrl: '/api/invoice_lines?invoice={id}',
      },
      lineSchema,
    });

    expect(detail.propertyName).toBe('lines');
    expect(detail.url).toBe('/api/invoice_lines?invoice={id}');
    expect(detail.fields?.some((field) => field.name === 'quantity')).toBe(true);
  });
});