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
      schemaWith([{ name: 'type', range: 'xsd:string', enumOptions: ['invoice', 'credit_note'] }]),
    );

    const typeField = fields.find((f) => f.name === 'type');
    expect(typeField?.type).toBe('enum');
    expect(typeField?.data).toEqual([
      { value: 'invoice', text: 'Invoice' },
      { value: 'credit_note', text: 'Credit Note' },
    ]);
  });

  it('keeps read-only enum properties as readonly selects so their filter remains a dropdown', () => {
    const fields = mapHydraSchemaToFields(
      schemaWith([
        { name: 'status', range: 'xsd:string', writeable: false, enumOptions: ['draft', 'paid'] },
      ]),
    );

    const status = fields.find((f) => f.name === 'status');
    expect(status?.type).toBe('enum');
    expect(status?.readonly).toBe(true);
    expect(status?.data).toEqual([
      { value: 'draft', text: 'Draft' },
      { value: 'paid', text: 'Paid' },
    ]);
  });

  it('forwards generic enum badge presentation hints without domain assumptions', () => {
    const fields = mapHydraSchemaToFields(
      schemaWith([
        {
          name: 'status',
          range: 'xsd:string',
          enumOptions: ['draft', 'paid'],
          crudHints: { presentation: 'badge', toneByValue: { draft: 'warning', paid: 'success' } },
        },
      ]),
    );

    const status = fields.find((f) => f.name === 'status');
    expect(status?.presentation).toBe('badge');
    expect(status?.toneByValue).toEqual({ draft: 'warning', paid: 'success' });
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

  it('applies hideInGrid and showInForm alias hints', () => {
    const fields = mapHydraSchemaToFields(
      schemaWith([
        { name: 'secret', range: 'xsd:string', crudHints: { hideInGrid: true } },
        { name: 'internal', range: 'xsd:string', crudHints: { showInForm: false } },
      ]),
    );

    expect(fields.find((f) => f.name === 'secret')?.visible).toBe(false);
    expect(fields.find((f) => f.name === 'internal')?.visibleOnForm).toBe(false);
    expect(fields.find((f) => f.name === 'secret')?.mappingReason).toContain('hideInGrid');
  });

  it('stamps mappingReason on inferred fields', () => {
    const fields = mapHydraSchemaToFields(schemaWith([{ name: 'active', range: 'xsd:boolean' }]));
    expect(fields.find((f) => f.name === 'active')?.mappingReason).toContain('rule-4');
  });

  it('hides and locks the x-sequence field on forms', () => {
    const fields = mapHydraSchemaToFields({
      ...schemaWith([
        { name: 'number', range: 'xsd:string', writeable: true },
        { name: 'status', range: 'xsd:string' },
      ]),
      sequence: {
        field: 'number',
        name: 'order',
        prefix: 'ORD-',
        padding: 4,
        scope: ['restaurant'],
      },
    });

    const number = fields.find((f) => f.name === 'number');
    expect(number?.visibleOnForm).toBe(false);
    expect(number?.readonly).toBe(true);
    expect(fields.find((f) => f.name === 'status')?.visibleOnForm).not.toBe(false);
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

  it('applies the readonly x-crud hint on writeable fields', () => {
    const fields = mapHydraSchemaToFields(
      schemaWith([
        {
          name: 'lineTotal',
          range: 'xsd:decimal',
          crudHints: { format: 'currency', readonly: true },
        },
      ]),
    );
    const lineTotal = fields.find((f) => f.name === 'lineTotal');
    expect(lineTotal?.type).toBe('currency');
    expect(lineTotal?.readonly).toBe(true);
  });

  it('maps hinted read-only decimals to readonly currency fields', () => {
    const fields = mapHydraSchemaToFields(
      schemaWith([
        {
          name: 'total',
          range: 'xsd:decimal',
          writeable: false,
          crudHints: { format: 'currency' },
        },
      ]),
    );
    const total = fields.find((f) => f.name === 'total');
    expect(total?.type).toBe('currency');
    expect(total?.readonly).toBe(true);
  });
});

describe('x-crud entity relation display field', () => {
  const centroCosto: HydraResourceSchema = {
    className: 'CentroCosto',
    apiUrl: '/api/centro_costos',
    fields: [
      {
        name: 'codigo',
        propertyType: 'rdf:Property',
        required: true,
        readable: true,
        writeable: true,
        range: 'xsd:string',
      },
      {
        name: 'nombre',
        propertyType: 'rdf:Property',
        required: true,
        readable: true,
        writeable: true,
        range: 'xsd:string',
        crudHints: { displayField: true },
      },
    ],
  };

  it('falls back to the built-in heuristic when the related entity declares no displayField', () => {
    const actor: HydraResourceSchema = {
      className: 'Actor',
      apiUrl: '/api/actors',
      fields: [
        {
          name: 'codigo',
          propertyType: 'rdf:Property',
          required: true,
          readable: true,
          writeable: true,
          range: 'xsd:string',
        },
        {
          name: 'nombre',
          propertyType: 'rdf:Property',
          required: true,
          readable: true,
          writeable: true,
          range: 'xsd:string',
        },
      ],
    };
    const fields = mapHydraSchemaToFields(
      schemaWith([{ name: 'proveedor', range: '#Actor', propertyType: 'Link' }]),
      undefined,
      (className) => (className === 'Actor' ? actor : undefined),
    );
    expect(fields.find((f) => f.name === 'proveedor')?.textField).toBe('nombre');
  });

  it('uses the related entity displayField hint over "first string field"', () => {
    const fields = mapHydraSchemaToFields(
      schemaWith([{ name: 'centroCosto', range: '#CentroCosto', propertyType: 'Link' }]),
      undefined,
      (className) => (className === 'CentroCosto' ? centroCosto : undefined),
    );
    // Without the hint this would resolve to "codigo" (declared first).
    expect(fields.find((f) => f.name === 'centroCosto')?.textField).toBe('nombre');
  });

  it('lets an explicit relation textField hint override the related displayField', () => {
    const fields = mapHydraSchemaToFields(
      schemaWith([
        {
          name: 'centroCosto',
          range: '#CentroCosto',
          propertyType: 'Link',
          crudHints: { textField: 'codigo' },
        },
      ]),
      undefined,
      (className) => (className === 'CentroCosto' ? centroCosto : undefined),
    );
    expect(fields.find((f) => f.name === 'centroCosto')?.textField).toBe('codigo');
  });

  it('formats a read-only entity relation (writeable: false) using the related displayField', () => {
    // Mirrors OrdenCompra::$cotizacion: never writeable (system-generated),
    // serializes as a nested object ({id, numero}), and previously rendered
    // blank because Rule 3 (display-only) didn't know it was an entity ref.
    const fields = mapHydraSchemaToFields(
      schemaWith([
        { name: 'cotizacion', range: '#Cotizacion', propertyType: 'Link', writeable: false },
      ]),
      undefined,
      (className) =>
        className === 'Cotizacion'
          ? ({
              className: 'Cotizacion',
              apiUrl: '/api/cotizacions',
              fields: [
                {
                  name: 'numero',
                  propertyType: 'rdf:Property',
                  required: true,
                  readable: true,
                  writeable: false,
                  range: 'xsd:string',
                  crudHints: { displayField: true },
                },
              ],
            } satisfies HydraResourceSchema)
          : undefined,
    );

    const field = fields.find((f) => f.name === 'cotizacion');
    expect(field?.type).toBe('none');
    expect(field?.formatter?.({ value: { id: 1, numero: 'COT-000001' } } as never)).toBe(
      'COT-000001',
    );
    expect(field?.formatter?.({ value: null } as never)).toBe('');
  });
});
