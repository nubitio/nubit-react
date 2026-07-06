/**
 * Pins the schema-resolution seam: one API doc in, Fields and form detail
 * out, parsed exactly once per doc object.
 */
import { describe, expect, it } from 'vitest';
import { getSchemaResolver } from './HydraSchemaResolver';
import type { ApiDoc, HydraApiDoc } from './types';

const hydraDoc: HydraApiDoc = {
  '@context': '/api/contexts/Entrypoint',
  '@id': '/api',
  '@type': 'hydra:ApiDocumentation',
  supportedClass: [
    {
      '@id': '#Category',
      '@type': 'hydra:Class',
      title: 'Category',
      supportedProperty: [
        {
          '@type': 'SupportedProperty',
          title: 'name',
          property: {
            '@id': '#Category/name',
            '@type': 'rdf:Property',
            label: 'name',
            range: 'xmls:string',
          },
          readable: true,
          writeable: true,
          required: true,
        },
      ],
      supportedOperation: [],
    },
  ],
};

const schemaData: ApiDoc = { format: 'hydra', doc: hydraDoc, entrypointHrefs: {} };

describe('getSchemaResolver', () => {
  it('parses each doc object exactly once and shares the resolver', () => {
    expect(getSchemaResolver(schemaData)).toBe(getSchemaResolver(schemaData));
  });

  it('parses again for a different doc object', () => {
    const other: ApiDoc = { format: 'hydra', doc: hydraDoc, entrypointHrefs: {} };
    expect(getSchemaResolver(other)).not.toBe(getSchemaResolver(schemaData));
  });
});

describe('HydraSchemaResolver', () => {
  const resolver = getSchemaResolver(schemaData);

  it('finds resources regardless of leading slash or query string', () => {
    expect(resolver.findResource('/api/categories')?.className).toBe('Category');
    expect(resolver.findResource('api/categories?page=1')?.className).toBe('Category');
    expect(resolver.findResource('/api/unknown')).toBeUndefined();
  });

  it('resolves a resource to its Fields and operations', () => {
    const resolved = resolver.resolveResource('/api/categories');
    expect(resolved.error).toBeUndefined();
    expect(resolved.fields.some((field) => field.name === 'name')).toBe(true);
  });

  it('reports unknown resources with the known-URL diagnostic', () => {
    const resolved = resolver.resolveResource('/api/nope');
    expect(resolved.fields).toEqual([]);
    expect(resolved.error?.message).toContain('No schema found for /api/nope');
    expect(resolved.error?.message).toContain('/api/categories');
  });

  it('answers embedded-line presence without callers touching the parse', () => {
    expect(resolver.hasEmbeddedLines('/api/categories')).toBe(false);
  });
});
