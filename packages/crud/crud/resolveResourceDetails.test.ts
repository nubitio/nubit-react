import { describe, expect, it } from 'vitest';
import type { ResourceConfig } from './ResourceConfig';
import { resolveResourceDetails } from './resolveResourceDetails';
import { textField } from '../field/FieldBuilders';

const field = (name: string) => textField().name(name).label(name).build();

const baseResource = (overrides: Partial<ResourceConfig> = {}): ResourceConfig => ({
  id: 'resource',
  title: 'Resource',
  apiUrl: '/api/resources',
  fields: [field('id')],
  ...overrides,
});

describe('resolveResourceDetails', () => {
  it('returns gridDetail and formDetail when both are set', () => {
    const gridField = field('grid');
    const formField = field('form');

    const resolved = resolveResourceDetails(baseResource({
      gridDetail: { url: '/grid/{id}/items', fields: [gridField] },
      formDetail: { url: '/form/{id}/items', fields: [formField], required: true },
    }));

    expect(resolved.gridDetail).toEqual({ url: '/grid/{id}/items', fields: [gridField] });
    expect(resolved.formDetail).toEqual({ url: '/form/{id}/items', fields: [formField], required: true });
  });

  it('returns undefined for missing detail configs', () => {
    const resolved = resolveResourceDetails(baseResource());

    expect(resolved.gridDetail).toBeUndefined();
    expect(resolved.formDetail).toBeUndefined();
  });

  it('returns only gridDetail when formDetail is absent', () => {
    const gridField = field('grid');

    const resolved = resolveResourceDetails(baseResource({
      gridDetail: { url: '/grid/{id}/items', fields: [gridField] },
    }));

    expect(resolved.gridDetail).toEqual({ url: '/grid/{id}/items', fields: [gridField] });
    expect(resolved.formDetail).toBeUndefined();
  });

  it('builds builder instances passed directly in detail fields', () => {
    const resolved = resolveResourceDetails(baseResource({
      gridDetail: { url: '/grid/{id}/items', fields: [textField().name('a').label('A')] },
      formDetail: { fields: [textField().name('b').label('B')] },
    }));

    expect(resolved.gridDetail?.fields).toEqual([textField().name('a').label('A').build()]);
    expect(resolved.formDetail?.fields).toEqual([textField().name('b').label('B').build()]);
  });

  it('builds builder instances returned by a gridDetail fields function', () => {
    const resolved = resolveResourceDetails(baseResource({
      gridDetail: { url: '/grid/{id}/items', fields: () => [textField().name('c').label('C')] },
    }));

    const fieldsFn = resolved.gridDetail?.fields as (row: Record<string, unknown>) => unknown;
    expect(fieldsFn({})).toEqual([textField().name('c').label('C').build()]);
  });

  it('passes through formDetail with all optional fields', () => {
    const formField = field('item');

    const resolved = resolveResourceDetails(baseResource({
      formDetail: {
        url: '/api/{id}/items',
        fields: [formField],
        propertyName: 'items',
        allowAdding: false,
        allowDeleting: true,
        allowUpdating: false,
        required: true,
      },
    }));

    expect(resolved.formDetail).toEqual({
      url: '/api/{id}/items',
      fields: [formField],
      propertyName: 'items',
      allowAdding: false,
      allowDeleting: true,
      allowUpdating: false,
      required: true,
    });
  });
});
