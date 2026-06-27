import { describe, expect, it } from 'vitest';
import type { ResourceFormDetail } from '@nubitio/crud';
import { resolveInferredFormDetail } from './resolveInferredFormDetail';
import type { HydraApiDoc } from './types';
import type { UseHydraMetadataResult } from './useHydraMetadata';

const embeddedLines = [
  {
    propertyName: 'lines',
    lineClass: 'SalesDocumentLine',
    routePath: '/api/sales_document_lines',
    parentQueryParam: 'document',
    reloadUrl: '/api/sales_document_lines?document={id}',
  },
];

const hydraDoc: HydraApiDoc = {
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
          title: 'salesDocument',
          property: {
            '@id': '#Entrypoint/salesDocument',
            '@type': 'Link',
            label: 'salesDocument',
            range: '#SalesDocument',
          },
          readable: true,
          writeable: false,
          required: false,
        },
      ],
      supportedOperation: [],
    },
    {
      '@id': '#SalesDocument',
      '@type': 'hydra:Class',
      title: 'SalesDocument',
      'x-embedded-lines': embeddedLines,
      supportedProperty: [
        {
          '@type': 'SupportedProperty',
          title: 'number',
          property: {
            '@id': '#SalesDocument/number',
            '@type': 'rdf:Property',
            label: 'number',
            range: 'xmls:string',
          },
          readable: true,
          writeable: true,
          required: true,
        },
      ],
      supportedOperation: [],
    },
    {
      '@id': '#SalesDocumentLine',
      '@type': 'hydra:Class',
      title: 'SalesDocumentLine',
      supportedProperty: [
        {
          '@type': 'SupportedProperty',
          title: 'quantity',
          property: {
            '@id': '#SalesDocumentLine/quantity',
            '@type': 'rdf:Property',
            label: 'quantity',
            range: 'xmls:decimal',
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

const schemaData: NonNullable<UseHydraMetadataResult['data']> = {
  format: 'hydra',
  doc: hydraDoc,
  entrypointHrefs: {},
};

describe('resolveInferredFormDetail', () => {
  it('infers formDetail from x-embedded-lines when no manual fields are set', () => {
    const result = resolveInferredFormDetail(
      '/api/sales_documents',
      { allowAdding: true },
      schemaData,
      embeddedLines,
    );

    expect(result?.propertyName).toBe('lines');
    expect(result?.url).toBe('/api/sales_document_lines?document={id}');
    expect(result?.allowAdding).toBe(true);
    expect(result?.fields?.some((field) => field.name === 'quantity')).toBe(true);
  });

  it('returns formDetail unchanged when manual fields are provided', () => {
    const manual = {
      propertyName: 'lines',
      fields: [{ name: 'custom', type: 'text' as const, label: 'Custom' }],
    } as ResourceFormDetail;

    const result = resolveInferredFormDetail('/api/sales_documents', manual, schemaData, embeddedLines);

    expect(result).toBe(manual);
  });

  it('returns formDetail unchanged when inferFields is false', () => {
    const optedOut = { propertyName: 'lines', inferFields: false as const };

    const result = resolveInferredFormDetail(
      '/api/sales_documents',
      optedOut,
      schemaData,
      embeddedLines,
    );

    expect(result).toBe(optedOut);
  });

  it('returns formDetail unchanged when schema data is missing', () => {
    const formDetail = { propertyName: 'lines' };

    expect(resolveInferredFormDetail('/api/sales_documents', formDetail, undefined, embeddedLines)).toBe(
      formDetail,
    );
  });

  it('returns formDetail unchanged when embedded lines metadata is absent', () => {
    const formDetail = { propertyName: 'lines' };

    expect(resolveInferredFormDetail('/api/sales_documents', formDetail, schemaData, [])).toBe(formDetail);
  });
});