/**
 * Integration "wiring-contract" tests for the CRUD engine against a REST backend.
 *
 * These do not click through the DOM (that would couple the safety net to the
 * 1097-line form's portals / matchMedia / async lookups). Instead they render the
 * real `SmartCrudPage` entry point with:
 *   - explicit fields (so no Hydra schema provider is needed),
 *   - the `RestAdapter`,
 *   - a mock `CoreHttpClient` that captures requests,
 *   - an in-memory `ResourceStore` factory,
 * and drive create / edit / delete through the public imperative `FormHandle`.
 *
 * The assertions verify the engine's data contract — that operations reach the
 * backend with the URL, method and RestAdapter-serialized body the engine promises.
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
  initCoreI18n,
  type CoreHttpClient,
  type CoreRuntime,
} from '@nubitio/core';

import { SmartCrudPage } from './SmartCrudPage';
import { defineResource } from './defineResource';
import { RestAdapter } from '../adapter/RestAdapter';
import { ResourceStoreProvider, type ResourceStore } from '../data/ResourceStore';
import { identityField, textField } from '../field/FieldBuilders';
import type { FormHandle } from '../form/FormHandle';

// ── i18n bootstrap (react-i18next requires an initialized instance) ────────────
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

// ── Shared resource definition (one config, varied only by the route entry) ────
const API_URL = '/api/products';

const resource = defineResource(API_URL, {
  title: 'Products',
  mercure: false,
  adapter: RestAdapter,
  routing: { routeParam: 'id' },
  fields: [
    identityField().build(),
    textField().name('name').label('Name').build(),
  ],
});

// ── Test doubles ───────────────────────────────────────────────────────────────
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
  { id: 1, name: 'Laptop' },
  { id: 2, name: 'Mouse' },
];

function makeStore(loadSpy: ReturnType<typeof vi.fn>): ResourceStore {
  return { load: loadSpy as unknown as ResourceStore['load'] };
}

const runtime: CoreRuntime = {
  notify: () => undefined,
  confirm: () => true, // auto-accept delete confirmation
};

function renderPage(entry: string, formRef: React.RefObject<FormHandle | null>, http: HttpMock, loadSpy: ReturnType<typeof vi.fn>) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CoreHttpProvider client={http.client}>
        <CoreRuntimeProvider runtime={runtime}>
          <ResourceStoreProvider factory={() => makeStore(loadSpy)}>
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

describe('CRUD engine ↔ RestAdapter wiring', () => {
  it('loads grid data through the injected ResourceStore factory', async () => {
    renderPage('/', createRef<FormHandle>(), http, loadSpy);
    await waitFor(() => expect(loadSpy).toHaveBeenCalled());
  });

  it('create → POST to the collection URL with the form body', async () => {
    const formRef = createRef<FormHandle>();
    renderPage('/new', formRef, http, loadSpy);

    await waitFor(() => expect(formRef.current).not.toBeNull());

    act(() => {
      formRef.current!.setValues({ name: 'Keyboard' });
      formRef.current!.save();
    });

    await waitFor(() => expect(http.post).toHaveBeenCalledTimes(1));
    expect(http.post).toHaveBeenCalledWith(API_URL, expect.objectContaining({ name: 'Keyboard' }));
    expect(http.patch).not.toHaveBeenCalled();
  });

  it('edit → PATCH to the item URL built by the adapter', async () => {
    const formRef = createRef<FormHandle>();
    renderPage('/7', formRef, http, loadSpy);

    await waitFor(() => expect(formRef.current).not.toBeNull());

    act(() => {
      formRef.current!.setValues({ id: 7, name: 'Edited' });
      formRef.current!.setIsEdit(true);
      formRef.current!.save();
    });

    await waitFor(() => expect(http.patch).toHaveBeenCalledTimes(1));
    expect(http.patch).toHaveBeenCalledWith(`${API_URL}/7`, expect.objectContaining({ name: 'Edited' }));
    expect(http.post).not.toHaveBeenCalled();
  });

  it('delete → DELETE to the item URL after confirmation', async () => {
    const formRef = createRef<FormHandle>();
    renderPage('/new', formRef, http, loadSpy);

    await waitFor(() => expect(formRef.current).not.toBeNull());

    act(() => {
      formRef.current!.deleteRow({ id: 9, name: 'Doomed' });
    });

    await waitFor(() => expect(http.delete).toHaveBeenCalledTimes(1));
    expect(http.delete).toHaveBeenCalledWith(`${API_URL}/9`);
  });
});
