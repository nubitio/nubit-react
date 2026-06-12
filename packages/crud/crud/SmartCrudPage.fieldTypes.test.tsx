/**
 * Characterization tests for per-field-type behaviour, pinned through the
 * `SmartCrudPage` seam before that behaviour moves into the Field-Type
 * registry (see CONTEXT.md).
 *
 * Two surfaces are pinned:
 *  - grid cell text: how each FieldType formats a loaded row for display,
 *  - form serialization: the wire body each FieldType produces on save.
 *
 * Expected display strings are computed with the same Intl calls the grid
 * uses, so the assertions are locale-independent.
 */
import React, { createRef } from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor, act, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import {
  CoreHttpProvider,
  CoreRuntimeProvider,
  getCoreLocale,
  getCoreTimezone,
  initCoreI18n,
  type CoreHttpClient,
  type CoreRuntime,
} from '@nubitio/core';

import { SmartCrudPage } from './SmartCrudPage';
import { defineResource } from './defineResource';
import { RestAdapter } from '../adapter/RestAdapter';
import { ResourceStoreProvider, type ResourceStore } from '../data/ResourceStore';
import {
  checkboxField,
  currencyField,
  dateField,
  enumField,
  identityField,
  numberField,
  passwordField,
  textareaField,
  textField,
} from '../field/FieldBuilders';
import type { FormHandle } from '../form/FormHandle';

beforeAll(() => {
  if (!i18next.isInitialized) {
    void i18next.use(initReactI18next).init({
      lng: 'en',
      fallbackLng: 'en',
      ns: ['core'],
      defaultNS: 'core',
      resources: {},
      interpolation: { escapeValue: false },
    });
  }
  initCoreI18n();
});

const API_URL = '/api/sales';

const resource = defineResource(API_URL, {
  title: 'Sales',
  mercure: false,
  adapter: RestAdapter,
  routing: { routeParam: 'id' },
  fields: [
    identityField().build(),
    textField().name('name').label('Name').build(),
    numberField().name('qty').label('Quantity').build(),
    currencyField().name('price').label('Price').build(),
    dateField().name('soldOn').label('Sold on').build(),
    checkboxField().name('active').label('Active').build(),
    enumField([
      { value: 'open', text: 'Open' },
      { value: 'closed', text: 'Closed' },
    ])
      .name('status')
      .label('Status')
      .build(),
    textareaField().name('notes').label('Notes').build(),
    passwordField().name('secret').label('Secret').build(),
  ],
});

const okResponse = <T,>(data: T) => ({
  data,
  status: 200,
  headers: new Headers(),
  response: {} as Response,
});

interface HttpMock {
  client: CoreHttpClient;
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
}

function makeHttpMock(): HttpMock {
  const get = vi.fn(async () => okResponse({ items: [], total: 0 }));
  const post = vi.fn(async () => okResponse({ id: 1 }));
  const patch = vi.fn(async () => okResponse({ id: 1 }));
  const del = vi.fn(async () => okResponse({}));
  const client = { get, post, patch, delete: del } as unknown as CoreHttpClient;
  return { client, get, post, patch, delete: del };
}

const SEED = [
  {
    id: 1,
    name: 'Laptop',
    qty: 3,
    price: 1234.5,
    soldOn: '2026-05-01T00:00:00',
    active: true,
    status: 'open',
    notes: 'first sale',
    secret: 'hunter2',
  },
];

const runtime: CoreRuntime = {
  notify: () => undefined,
  confirm: () => true,
};

function renderPage(
  entry: string,
  formRef: React.RefObject<FormHandle | null>,
  http: HttpMock,
  loadSpy: ReturnType<typeof vi.fn>,
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CoreHttpProvider client={http.client}>
        <CoreRuntimeProvider runtime={runtime}>
          <ResourceStoreProvider
            factory={() => ({ load: loadSpy as unknown as ResourceStore['load'] })}
          >
            <MemoryRouter initialEntries={[entry]}>
              <Routes>
                <Route path="/:id" element={<SmartCrudPage resource={resource} formRef={formRef} />} />
                <Route path="/" element={<SmartCrudPage resource={resource} formRef={formRef} />} />
              </Routes>
            </MemoryRouter>
          </ResourceStoreProvider>
        </CoreRuntimeProvider>
      </CoreHttpProvider>
    </QueryClientProvider>,
  );
}

let http: HttpMock;
let loadSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  http = makeHttpMock();
  loadSpy = vi.fn(async () => ({ data: SEED, totalCount: SEED.length }));
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('grid cell text per field type', () => {
  it('formats currency, date, boolean and enum cells', async () => {
    const { container } = renderPage('/', createRef<FormHandle>(), http, loadSpy);
    await waitFor(() => expect(loadSpy).toHaveBeenCalled());

    const expectedCurrency = (1234.5).toLocaleString(getCoreLocale(), {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const expectedDate = new Date('2026-05-01T00:00:00').toLocaleDateString(getCoreLocale(), {
      timeZone: getCoreTimezone(),
    });

    await waitFor(() => expect(container.textContent).toContain('Laptop'));
    const text = container.textContent ?? '';
    expect(text).toContain('3');
    expect(text).toContain(expectedCurrency);
    expect(text).toContain(expectedDate);
    expect(text).toContain('Yes');
    expect(text).toContain('Open');
  });
});

describe('grid filter row per field type', () => {
  it('renders the type-specific filter editor for every filterable column', async () => {
    const { container } = renderPage('/', createRef<FormHandle>(), http, loadSpy);
    await waitFor(() => expect(loadSpy).toHaveBeenCalled());
    await waitFor(() => expect(container.textContent).toContain('Laptop'));

    // TEXT gets a text input, NUMBER/CURRENCY a numeric input.
    expect(container.querySelectorAll('input.nb-datagrid__filter-input[type="text"]').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('input.nb-datagrid__filter-input[type="number"]').length).toBe(2);
    // DATE gets the date picker editor.
    expect(container.querySelector('.nb-datagrid__filter-date')).not.toBeNull();
    // ENUM gets the all-values dropdown (AppDropdown renders derived ids).
    expect(container.querySelector('#nb-datagrid-filter-status-value')).not.toBeNull();
    // Comparison operator dropdowns exist for number columns.
    expect(container.querySelector('#nb-datagrid-filter-op-qty-value')).not.toBeNull();
  });
});

describe('form controls per field type', () => {
  it('renders the type-specific control for every field', async () => {
    const formRef = createRef<FormHandle>();
    renderPage('/new', formRef, http, loadSpy);
    await waitFor(() => expect(formRef.current).not.toBeNull());

    // The form may mount inside a dialog portal, so query the whole document.
    await waitFor(() =>
      expect(document.querySelector('input#nb-form-name[type="text"]')).not.toBeNull(),
    );
    expect(document.querySelector('input#nb-form-qty[type="number"]')).not.toBeNull();
    expect(document.querySelector('input#nb-form-price[type="number"]')).not.toBeNull();
    // DatePicker renders its own input wired to the field id.
    expect(document.querySelector('#nb-form-soldOn')).not.toBeNull();
    expect(document.querySelector('input[name="active"][type="checkbox"], .nb-form__checkbox input[type="checkbox"]')).not.toBeNull();
    // Enum renders the lookup combobox.
    expect(document.querySelector('input#nb-form-status[role="combobox"]')).not.toBeNull();
    expect(document.querySelector('textarea#nb-form-notes')).not.toBeNull();
    expect(document.querySelector('input#nb-form-secret[type="password"]')).not.toBeNull();
  });
});

describe('form serialization per field type', () => {
  it('serializes each field type to its wire format on create', async () => {
    const formRef = createRef<FormHandle>();
    renderPage('/new', formRef, http, loadSpy);
    await waitFor(() => expect(formRef.current).not.toBeNull());

    act(() => {
      formRef.current!.setValues({
        name: 'Keyboard',
        qty: '4',
        price: '12.3',
        soldOn: '2026-05-02',
        active: true,
        status: 'closed',
        notes: 'rush order',
        secret: 'pw',
      });
      formRef.current!.save();
    });

    await waitFor(() => expect(http.post).toHaveBeenCalledTimes(1));
    const [url, body] = http.post.mock.calls[0] as [string, Record<string, unknown>];
    expect(url).toBe(API_URL);
    expect(body.name).toBe('Keyboard');
    // NUMBER coerces to number; CURRENCY (sendAsString) becomes a fixed-point string.
    expect(body.qty).toBe(4);
    expect(body.price).toBe('12.30');
    // DATE stays a YYYY-MM-DD business date.
    expect(body.soldOn).toBe('2026-05-02');
    expect(body.active).toBe(true);
    expect(body.status).toBe('closed');
    expect(body.notes).toBe('rush order');
  });

  it('omits cleared numeric and currency fields from the payload', async () => {
    const formRef = createRef<FormHandle>();
    renderPage('/new', formRef, http, loadSpy);
    await waitFor(() => expect(formRef.current).not.toBeNull());

    act(() => {
      formRef.current!.setValues({ name: 'NoNumbers', qty: '', price: null });
      formRef.current!.save();
    });

    await waitFor(() => expect(http.post).toHaveBeenCalledTimes(1));
    const [, body] = http.post.mock.calls[0] as [string, Record<string, unknown>];
    expect(body.name).toBe('NoNumbers');
    expect('qty' in body).toBe(false);
    expect('price' in body).toBe(false);
  });
});
