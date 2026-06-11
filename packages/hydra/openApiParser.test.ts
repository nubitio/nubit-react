import { describe, expect, it } from 'vitest';
import { toDashCase, toSnakeCase, pluralize, normalizeRange, parseHydraDoc } from './openApiParser';
import type { HydraApiDoc } from './types';

// ── toDashCase ────────────────────────────────────────────────────────────────

describe('toDashCase', () => {
  it('lowercases plain names', () => {
    expect(toDashCase('Category')).toBe('category');
  });

  it('converts camelCase to dash-case', () => {
    expect(toDashCase('cashMovementCategory')).toBe('cash-movement-category');
  });

  it('converts PascalCase to dash-case', () => {
    expect(toDashCase('SunatCatalog')).toBe('sunat-catalog');
    expect(toDashCase('CashMovementCategory')).toBe('cash-movement-category');
  });

  it('keeps already-lowercase-dashed strings unchanged', () => {
    expect(toDashCase('warehouse')).toBe('warehouse');
  });
});

// ── toSnakeCase ───────────────────────────────────────────────────────────────

describe('toSnakeCase', () => {
  it('converts PascalCase to snake_case', () => {
    expect(toSnakeCase('Category')).toBe('category');
    expect(toSnakeCase('CashMovementCategory')).toBe('cash_movement_category');
  });

  it('converts camelCase to snake_case', () => {
    expect(toSnakeCase('cashMovementCategory')).toBe('cash_movement_category');
  });
});

// ── pluralize ─────────────────────────────────────────────────────────────────

describe('pluralize', () => {
  it('appends s for regular words', () => {
    expect(pluralize('warehouse')).toBe('warehouses');
    expect(pluralize('product')).toBe('products');
  });

  it('handles consonant+y → ies', () => {
    expect(pluralize('category')).toBe('categories');
    expect(pluralize('company')).toBe('companies');
  });

  it('keeps vowel+y words with s', () => {
    expect(pluralize('day')).toBe('days');
    expect(pluralize('key')).toBe('keys');
  });

  it('appends es for s/x/z/ch/sh endings', () => {
    expect(pluralize('branch')).toBe('branches');
    expect(pluralize('box')).toBe('boxes');
  });
});

// ── normalizeRange ────────────────────────────────────────────────────────────

describe('normalizeRange', () => {
  it('returns string ranges unchanged', () => {
    expect(normalizeRange('xmls:string')).toBe('xmls:string');
    expect(normalizeRange('#Company')).toBe('#Company');
  });

  it('returns undefined for null/undefined', () => {
    expect(normalizeRange(null)).toBeUndefined();
    expect(normalizeRange(undefined)).toBeUndefined();
  });

  it('extracts @id from object ranges', () => {
    expect(normalizeRange({ '@id': 'http://www.w3.org/2001/XMLSchema#integer' })).toBe(
      'http://www.w3.org/2001/XMLSchema#integer',
    );
  });

  it('extracts @id from owl:equivalentClass array ranges', () => {
    const arrayRange = [
      {
        'owl:equivalentClass': {
          'owl:allValuesFrom': { '@id': '#Category' },
        },
      },
    ];
    expect(normalizeRange(arrayRange)).toBe('#Category');
  });

  it('returns undefined for array range without matching structure', () => {
    expect(normalizeRange([{ unrelated: true }])).toBeUndefined();
  });
});

// ── parseHydraDoc ─────────────────────────────────────────────────────────────

describe('parseHydraDoc', () => {
  const minimalDoc: HydraApiDoc = {
    '@context': '/api/contexts/Entrypoint',
    '@id': '/api',
    '@type': 'hydra:ApiDocumentation',
    supportedClass: [
      {
        '@id': '#Entrypoint',
        '@type': 'hydra:Class',
        title: 'Entrypoint',
        supportedProperty: [
          {
            '@type': 'SupportedProperty',
            title: 'product',
            property: { '@id': '#Entrypoint/product', '@type': 'Link', label: 'product', range: '#Product' },
            readable: true,
            writeable: false,
            required: false,
          },
        ],
        supportedOperation: [],
      },
      {
        '@id': '#Product',
        '@type': 'hydra:Class',
        title: 'Product',
        supportedProperty: [
          {
            '@type': 'SupportedProperty',
            title: 'Nombre',
            property: {
              '@id': '#Product/name',
              '@type': 'rdf:Property',
              label: 'name',
              range: 'xmls:string',
            },
            readable: true,
            writeable: true,
            required: true,
          },
          {
            '@type': 'SupportedProperty',
            title: 'Precio',
            property: {
              '@id': '#Product/price',
              '@type': 'rdf:Property',
              label: 'price',
              range: 'xmls:decimal',
            },
            readable: true,
            writeable: true,
            required: false,
          },
          {
            '@type': 'SupportedProperty',
            title: 'Código interno',
            property: {
              '@id': '#Product/internalCode',
              '@type': 'rdf:Property',
              label: 'internalCode',
              range: 'xmls:string',
            },
            readable: false,
            writeable: true,
            required: false,
          },
        ],
        supportedOperation: [],
      },
    ],
  };

  it('parses class names and excludes the Entrypoint class', () => {
    const result = parseHydraDoc(minimalDoc);
    expect(Object.keys(result)).toContain('Product');
    expect(Object.keys(result)).not.toContain('Entrypoint');
  });

  it('derives the API URL from the Entrypoint property', () => {
    const result = parseHydraDoc(minimalDoc);
    expect(result['Product'].apiUrl).toBe('/api/products');
  });

  it('parses readable properties as fields', () => {
    const result = parseHydraDoc(minimalDoc);
    const fieldNames = result['Product'].fields.map((f) => f.name);
    expect(fieldNames).toContain('name');
    expect(fieldNames).toContain('price');
  });

  it('skips non-readable (write-only) properties', () => {
    const result = parseHydraDoc(minimalDoc);
    const fieldNames = result['Product'].fields.map((f) => f.name);
    expect(fieldNames).not.toContain('internalCode');
  });

  it('marks required fields correctly', () => {
    const result = parseHydraDoc(minimalDoc);
    const nameField = result['Product'].fields.find((f) => f.name === 'name');
    const priceField = result['Product'].fields.find((f) => f.name === 'price');
    expect(nameField?.required).toBe(true);
    expect(priceField?.required).toBe(false);
  });

  it('stores the translated title from the SupportedProperty wrapper', () => {
    const result = parseHydraDoc(minimalDoc);
    const nameField = result['Product'].fields.find((f) => f.name === 'name');
    expect(nameField?.['hydra:title']).toBe('Nombre');
  });

  it('returns empty object for a doc with no non-entrypoint classes', () => {
    const emptyDoc: HydraApiDoc = {
      '@context': '/api/contexts/Entrypoint',
      '@id': '/api',
      '@type': 'hydra:ApiDocumentation',
      supportedClass: [
        {
          '@id': '#Entrypoint',
          '@type': 'hydra:Class',
          title: 'Entrypoint',
          supportedProperty: [],
          supportedOperation: [],
        },
      ],
    };
    const result = parseHydraDoc(emptyDoc);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('extracts supportedOperations from the class', () => {
    const doc: HydraApiDoc = {
      '@context': '/api/contexts/Entrypoint',
      '@id': '/api',
      '@type': 'hydra:ApiDocumentation',
      supportedClass: [
        {
          '@id': '#Entrypoint',
          '@type': 'hydra:Class',
          title: 'Entrypoint',
          supportedProperty: [
            {
              '@type': 'SupportedProperty',
              title: 'category',
              property: { '@id': '#Entrypoint/category', '@type': 'Link', label: 'category', range: '#Category' },
              readable: true,
              writeable: false,
              required: false,
            },
          ],
          supportedOperation: [],
        },
        {
          '@id': '#Category',
          '@type': 'hydra:Class',
          title: 'Category',
          supportedProperty: [],
          supportedOperation: [
            { 'hydra:method': 'GET' },
            { 'hydra:method': 'POST' },
            { 'hydra:method': 'DELETE' },
          ],
        },
      ],
    };
    const result = parseHydraDoc(doc);
    expect(result['Category'].supportedOperations).toContain('GET');
    expect(result['Category'].supportedOperations).toContain('POST');
    expect(result['Category'].supportedOperations).toContain('DELETE');
  });

  it('extracts hydra:search mappings from a class', () => {
    const doc: HydraApiDoc = {
      '@context': '/api/contexts/Entrypoint',
      '@id': '/api',
      '@type': 'hydra:ApiDocumentation',
      supportedClass: [
        {
          '@id': '#Entrypoint',
          '@type': 'hydra:Class',
          title: 'Entrypoint',
          supportedProperty: [
            {
              '@type': 'SupportedProperty',
              title: 'item',
              property: { '@id': '#Entrypoint/item', '@type': 'Link', label: 'item', range: '#Item' },
              readable: true,
              writeable: false,
              required: false,
            },
          ],
          supportedOperation: [],
        },
        {
          '@id': '#Item',
          '@type': 'hydra:Class',
          title: 'Item',
          supportedProperty: [],
          'hydra:search': {
            'hydra:mapping': [
              { 'hydra:property': 'name', 'hydra:variable': 'name', 'hydra:required': false },
              { 'hydra:property': 'status', 'hydra:variable': 'status', 'hydra:required': false },
            ],
          },
        },
      ],
    };
    const result = parseHydraDoc(doc);
    expect(result['Item'].searchMappings).toHaveLength(2);
    expect(result['Item'].searchMappings?.[0].property).toBe('name');
    expect(result['Item'].searchMappings?.[1].variable).toBe('status');
  });
});

// ── parseHydraDoc + entrypointHrefs ──────────────────────────────────────────

describe('parseHydraDoc with entrypoint hrefs', () => {
  const docWith = (className: string, propName: string): HydraApiDoc => ({
    '@context': '/api/contexts/Entrypoint',
    '@id': '/api',
    '@type': 'hydra:ApiDocumentation',
    supportedClass: [
      {
        '@id': '#Entrypoint',
        '@type': 'hydra:Class',
        title: 'Entrypoint',
        supportedProperty: [
          {
            '@type': 'SupportedProperty',
            title: propName,
            property: {
              '@id': `#Entrypoint/${propName}`,
              '@type': 'Link',
              label: propName,
              range: `#${className}`,
            },
            readable: true,
            writeable: false,
            required: false,
          },
        ],
        supportedOperation: [],
      },
      {
        '@id': `#${className}`,
        '@type': 'hydra:Class',
        title: className,
        supportedProperty: [],
        supportedOperation: [],
      },
    ],
  });

  it('prefers the real href from the entrypoint over the heuristic', () => {
    // Backend uses underscore paths — the heuristic would guess dashes.
    const result = parseHydraDoc(docWith('SalesDocumentLine', 'salesDocumentLine'), {
      salesDocumentLine: '/api/sales_document_lines',
    });
    expect(result['SalesDocumentLine'].apiUrl).toBe('/api/sales_document_lines');
  });

  it('resolves irregular plurals the heuristic cannot guess', () => {
    const result = parseHydraDoc(docWith('DocumentSeries', 'documentSeries'), {
      documentSeries: '/api/document-series',
    });
    expect(result['DocumentSeries'].apiUrl).toBe('/api/document-series');
  });

  it('falls back to the heuristic when the property has no href', () => {
    const result = parseHydraDoc(docWith('Product', 'product'), {
      somethingElse: '/api/something-else',
    });
    expect(result['Product'].apiUrl).toBe('/api/products');
  });

  it('falls back to the heuristic when hrefs are undefined', () => {
    const result = parseHydraDoc(docWith('Product', 'product'), undefined);
    expect(result['Product'].apiUrl).toBe('/api/products');
  });
});
