import type { PropsWithChildren } from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FieldType } from '../field/FieldType';
import type { SmartCrudFieldContract } from '../crud/fieldContract';
import {
  ResourceSchemaProvider,
  type ResourceSchemaResolver,
  useResolvedResourceFields,
} from './ResourceSchema';

describe('useResolvedResourceFields', () => {
  it('preserves schema metadata for a manual field contract', () => {
    const resolveFormDetail = () => undefined;
    const resolver: ResourceSchemaResolver = {
      useResourceSchema: ({ enabled }) =>
        enabled
          ? {
              fields: [],
              isLoading: false,
              error: undefined,
              supportedOperations: ['GET', 'POST'],
              embeddedLines: [
                {
                  propertyName: 'lines',
                  lineClass: 'Line',
                  routePath: '/api/lines',
                  parentQueryParam: 'parent',
                  reloadUrl: '/api/documents/{id}',
                },
              ],
              resolveFormDetail,
            }
          : { fields: [], isLoading: false, error: undefined, supportedOperations: [] },
    };
    const contract = {
      source: 'manual',
      strategy: 'replace',
      fields: [{ name: 'title', label: 'Title', type: FieldType.TEXT }],
    } as unknown as SmartCrudFieldContract<{ title: string }>;
    const wrapper = ({ children }: PropsWithChildren) => (
      <ResourceSchemaProvider resolver={resolver}>{children}</ResourceSchemaProvider>
    );

    const { result } = renderHook(
      () => useResolvedResourceFields({ apiUrl: '/api/documents', fieldContract: contract }),
      { wrapper },
    );

    expect(result.current.fields).toHaveLength(1);
    expect(result.current.supportedOperations).toEqual(['GET', 'POST']);
    expect(result.current.embeddedLines?.[0]?.propertyName).toBe('lines');
    expect(result.current.resolveFormDetail).toBe(resolveFormDetail);
  });
});
