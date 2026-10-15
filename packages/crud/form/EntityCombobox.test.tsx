import { useState } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { initCoreI18n, type CoreHttpClient } from '@nubitio/core';
import { NativeEntitySelect } from './EntityCombobox';
import { ResourceStoreProvider, type ResourceStore } from '../data/ResourceStore';
import { entityField, tagsField } from '../field/FieldBuilders';
import { entityTypeModule } from '../field/registry/types/entity';
import { RestAdapter } from '../adapter/RestAdapter';
import { HydraAdapter } from '../adapter/HydraAdapter';

beforeAll(async () => {
  if (!i18next.isInitialized)
    await i18next
      .use(initReactI18next)
      .init({ lng: 'en', fallbackLng: 'en', resources: {}, interpolation: { escapeValue: false } });
  initCoreI18n();
});
afterEach(cleanup);
const httpClient = {} as CoreHttpClient;
const emptyStore: ResourceStore = {
  load: async () => ({ data: [], totalCount: 0, summary: null }),
};
const factory = () => emptyStore;

describe('CRUD relation combobox', () => {
  it('preserves numeric IDs including zero and passes the selected record to onSelect consumers', async () => {
    const field = entityField('', 'id', 'name').name('owner').label('Owner').build();
    const onChange = vi.fn();
    function Example() {
      const [value, setValue] = useState<unknown>(0);
      return (
        <NativeEntitySelect
          field={field}
          options={[
            { id: 0, name: 'Zero' },
            { id: 2, name: 'Two' },
          ]}
          httpClient={httpClient}
          className="test-control"
          value={value}
          onChange={(key, item) => {
            setValue(key);
            onChange(key, item);
          }}
        />
      );
    }
    render(
      <ResourceStoreProvider factory={factory}>
        <Example />
      </ResourceStoreProvider>,
    );
    const input = screen.getByRole('combobox', { name: 'Owner' });
    expect((input as HTMLInputElement).value).toBe('Zero');
    await userEvent.setup().clear(input);
    await userEvent.setup().type(input, 'Two');
    await userEvent.setup().keyboard('{ArrowDown}{Enter}');
    expect(onChange).toHaveBeenLastCalledWith(2, { id: 2, name: 'Two' });
  });

  it('resolves a selected IRI outside the current page using byKey', async () => {
    const field = entityField('/api/people', '_iri', 'name').name('owner').label('Owner').build();
    const byKey = vi.fn().mockResolvedValue({ '@id': '/api/people/99', name: 'Off-page owner' });
    const store = { ...emptyStore, byKey };
    render(
      <ResourceStoreProvider factory={() => store}>
        <NativeEntitySelect
          field={field}
          options={[]}
          httpClient={httpClient}
          className="test-control"
          value="/api/people/99"
          onChange={vi.fn()}
        />
      </ResourceStoreProvider>,
    );
    await waitFor(() =>
      expect((screen.getByRole('combobox') as HTMLInputElement).value).toBe('Off-page owner'),
    );
    expect(byKey).toHaveBeenCalledWith('/api/people/99');
  });

  it('retains selected tag labels from prepend data and emits raw numeric IDs on removal', async () => {
    const field = tagsField('', 'id', 'name').name('owners').label('Owners').build();
    const onChange = vi.fn();
    render(
      <ResourceStoreProvider factory={factory}>
        <NativeEntitySelect
          field={field}
          options={[]}
          prependData={[{ id: 1, name: 'Off-page' }]}
          httpClient={httpClient}
          className="test-control"
          value={[1]}
          onChange={onChange}
        />
      </ResourceStoreProvider>,
    );
    expect(screen.getByText('Off-page')).toBeTruthy();
    await userEvent.setup().click(screen.getByRole('button', { name: /^Remove Off-page/ }));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('normalizes multiple entity objects before serializing REST IDs and Hydra IRIs', () => {
    for (const [adapter, valueField, data, expected] of [
      [RestAdapter, 'id', [{ id: 0 }, { id: 2 }], [0, 2]],
      [
        HydraAdapter,
        '_iri',
        [{ '@id': '/api/people/1' }, { '@id': '/api/people/2' }],
        ['/api/people/1', '/api/people/2'],
      ],
      [HydraAdapter, '_iri', [{ id: 0 }, { id: 2 }], ['/api/people/0', '/api/people/2']],
    ] as const) {
      const field = entityField('/api/people', valueField, 'name').multiple(true).build();
      const normalized = entityTypeModule.normalizeFormValue!(field, [...data], {
        adapter,
        prependEntityOption: vi.fn(),
        getPrependData: () => [],
      });
      expect(normalized).toEqual({ kind: 'set', value: expected });
      const serialized = entityTypeModule.serializeFormValue(
        field,
        normalized.kind === 'set' ? normalized.value : null,
        { adapter },
      );
      expect(serialized).toEqual({ kind: 'set', value: expected });
    }
  });
});
