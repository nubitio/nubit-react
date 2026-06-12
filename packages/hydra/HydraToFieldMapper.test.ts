import { describe, expect, it } from 'vitest';
import { mapHydraSchemaToFields } from './HydraToFieldMapper';
import type { HydraFieldSchema, HydraResourceSchema } from './types';

const schemaWith = (fields: Partial<HydraFieldSchema>[]): HydraResourceSchema => ({
  className: 'Thing',
  apiUrl: '/api/things',
  fields: fields.map((f) => ({
    name: 'field',
    propertyType: 'rdf:Property',
    required: false,
    readable: true,
    writeable: true,
    ...f,
  })),
});

describe('mapHydraSchemaToFields', () => {
  it('maps enum-carrying string properties to a select with humanised labels', () => {
    const fields = mapHydraSchemaToFields(
      schemaWith([
        { name: 'type', range: 'xsd:string', enumOptions: ['invoice', 'credit_note'] },
      ]),
    );

    const typeField = fields.find((f) => f.name === 'type');
    expect(typeField?.type).toBe('enum');
    expect(typeField?.data).toEqual([
      { value: 'invoice', text: 'Invoice' },
      { value: 'credit_note', text: 'Credit Note' },
    ]);
  });

  it('keeps plain strings as text fields when no enum is present', () => {
    const fields = mapHydraSchemaToFields(schemaWith([{ name: 'note', range: 'xsd:string' }]));
    expect(fields.find((f) => f.name === 'note')?.type).toBe('text');
  });

  it('does not turn booleans into enums', () => {
    const fields = mapHydraSchemaToFields(
      schemaWith([{ name: 'active', range: 'xsd:boolean', enumOptions: ['true', 'false'] }]),
    );
    expect(fields.find((f) => f.name === 'active')?.type).toBe('switch');
  });

  it('applies the visibleOnForm x-crud hint', () => {
    const fields = mapHydraSchemaToFields(
      schemaWith([
        { name: 'lines', range: 'xsd:string', crudHints: { visibleOnForm: false } },
        { name: 'name', range: 'xsd:string' },
      ]),
    );

    expect(fields.find((f) => f.name === 'lines')?.visibleOnForm).toBe(false);
    expect(fields.find((f) => f.name === 'name')?.visibleOnForm).not.toBe(false);
  });
});

describe('x-crud format: image / file', () => {
  it('maps image-hinted relations to an upload field targeting {base}media', () => {
    const fields = mapHydraSchemaToFields(
      schemaWith([{ name: 'photo', range: '#Media', crudHints: { format: 'image' } }]),
    );

    const photo = fields.find((f) => f.name === 'photo');
    expect(photo?.type).toBe('file');
    expect(photo?.url).toBe('/api/media');
    expect(photo?.accept).toBe('image/*');
  });

  it('maps file-hinted relations without the image accept default', () => {
    const fields = mapHydraSchemaToFields(
      schemaWith([{ name: 'attachment', range: '#Media', crudHints: { format: 'file' } }]),
    );

    const attachment = fields.find((f) => f.name === 'attachment');
    expect(attachment?.type).toBe('file');
    expect(attachment?.url).toBe('/api/media');
    expect(attachment?.accept ?? null).toBeNull();
  });

  it('keeps unhinted relations as entity selects', () => {
    const fields = mapHydraSchemaToFields(
      schemaWith([{ name: 'category', range: '#Category', propertyType: 'Link' }]),
    );

    expect(fields.find((f) => f.name === 'category')?.type).toBe('entity');
  });
});

describe('x-crud format: currency', () => {
  it('maps hinted decimals to currency fields', () => {
    const fields = mapHydraSchemaToFields(
      schemaWith([
        { name: 'price', range: 'xsd:decimal', crudHints: { format: 'currency' } },
        { name: 'qty', range: 'xsd:decimal' },
      ]),
    );
    expect(fields.find((f) => f.name === 'price')?.type).toBe('currency');
    expect(fields.find((f) => f.name === 'qty')?.type).toBe('number');
  });

  it('maps hinted string-ranged decimals to currency fields', () => {
    // API Platform serializes Doctrine DECIMAL columns as xsd:string, so this
    // is the range real backends emit for money fields.
    const fields = mapHydraSchemaToFields(
      schemaWith([
        { name: 'price', range: 'xsd:string', crudHints: { format: 'currency' } },
        { name: 'sku', range: 'xsd:string' },
      ]),
    );
    expect(fields.find((f) => f.name === 'price')?.type).toBe('currency');
    expect(fields.find((f) => f.name === 'sku')?.type).toBe('text');
  });

  it('prefers the enum select over the currency hint', () => {
    const fields = mapHydraSchemaToFields(
      schemaWith([
        {
          name: 'fee',
          range: 'xsd:string',
          enumOptions: ['0.00', '5.00'],
          crudHints: { format: 'currency' },
        },
      ]),
    );
    expect(fields.find((f) => f.name === 'fee')?.type).toBe('enum');
  });

  it('maps hinted read-only decimals to readonly currency fields', () => {
    const fields = mapHydraSchemaToFields(
      schemaWith([
        { name: 'total', range: 'xsd:decimal', writeable: false, crudHints: { format: 'currency' } },
      ]),
    );
    const total = fields.find((f) => f.name === 'total');
    expect(total?.type).toBe('currency');
    expect(total?.readonly).toBe(true);
  });
});
