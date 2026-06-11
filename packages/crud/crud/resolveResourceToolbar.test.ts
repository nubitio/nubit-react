import { describe, expect, it, vi } from 'vitest';
import type { ResourceConfig, ResourceToolbarContext } from './ResourceConfig';
import { resolveResourceToolbar } from './resolveResourceToolbar';
import { textField } from '../field/FieldBuilders';
import type { DataRecord } from '@nubit/core';

const field = textField().name('id').label('ID').build();

const resource = (overrides: Partial<ResourceConfig> = {}): ResourceConfig => ({
  id: 'resource',
  title: 'Resource',
  apiUrl: '/api/resources',
  fields: [field],
  ...overrides,
});

const context = (target: ResourceConfig): ResourceToolbarContext => ({
  resource: target,
  selectedRow: { id: 1, name: 'A' },
  selectedRows: [{ id: 1, name: 'A' }],
  gridRef: { current: null },
  formRef: { current: null },
  events: {},
  emit: vi.fn(),
});

describe('resolveResourceToolbar', () => {
  it('returns static toolbar items unchanged', () => {
    const toolbar = { utility: [{ text: 'Exportar' }] };
    const target = resource({ toolbar });

    expect(resolveResourceToolbar(target, context(target))).toBe(toolbar);
  });

  it('evaluates toolbar factories with the current selection context', () => {
    const target = resource({
      toolbar: ({ selectedRow }: ResourceToolbarContext<DataRecord>) => ({
        selection: [{ text: selectedRow?.name === 'A' ? 'Abrir A' : 'Abrir' }],
      }),
    });

    expect(resolveResourceToolbar(target, context(target))).toEqual({ selection: [{ text: 'Abrir A' }] });
  });
});
