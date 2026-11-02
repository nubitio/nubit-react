import { useEffect, useState } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { initCoreI18n } from '@nubitio/core';
import { EntityDropdown } from './EntityDropdown';
import { ResourceStoreProvider, type ResourceStore } from '../data/ResourceStore';

beforeAll(async () => {
  if (!i18next.isInitialized)
    await i18next
      .use(initReactI18next)
      .init({ lng: 'en', fallbackLng: 'en', resources: {}, interpolation: { escapeValue: false } });
  initCoreI18n();
});
afterEach(cleanup);

const people = [
  { id: 1, name: 'General' },
  { id: 2, name: 'Cliente CI E2E' },
];

/** A parent that re-renders often and passes fresh (but equal) array props every time. */
function BusyParent({ onChange }: { onChange: (value: string | null) => void }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((tick) => tick + 1), 40);
    return () => clearInterval(timer);
  }, []);
  return (
    <EntityDropdown
      url="/api/customers"
      valueField="id"
      textField="name"
      placeholder="Search customers"
      value="1"
      onChange={onChange}
      searchExpr={['name', 'ruc']}
      filters={[{ field: 'active', operator: '=', value: true }]}
    />
  );
}

describe('EntityDropdown with frequently re-rendering parents', () => {
  it('still searches and lists options when props are recreated on every render', async () => {
    const load = vi.fn(async ({ searchValue }: { searchValue?: string }) => ({
      data: people.filter(
        (p) => !searchValue || p.name.toLowerCase().includes(searchValue.toLowerCase()),
      ),
      totalCount: 2,
      summary: null,
    }));
    const byKey = vi.fn(async () => people[0]);
    const store = { load, byKey } as unknown as ResourceStore;
    render(
      <ResourceStoreProvider factory={() => store}>
        <BusyParent onChange={vi.fn()} />
      </ResourceStoreProvider>,
    );
    const input = screen.getByRole('combobox');
    await userEvent.setup().clear(input);
    await userEvent.setup().type(input, 'Cliente');
    expect(
      await screen.findByRole('option', { name: /Cliente CI E2E/ }, { timeout: 3000 }),
    ).toBeTruthy();
    expect(load).toHaveBeenCalled();
    // The selected record is resolved once, not again on every render.
    await waitFor(() => expect(byKey.mock.calls.length).toBeLessThanOrEqual(1));
  });
});
