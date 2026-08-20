import React from 'react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import {
  CoreHttpProvider,
  CoreRuntimeProvider,
  initCoreI18n,
  type CoreHttpClient,
} from '@nubitio/core';

import { NativeFormView } from './NativeFormView';
import { identityField, numberField, textField } from '../field/FieldBuilders';
import { ResourceStoreProvider, type ResourceStore } from '../data/ResourceStore';

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

afterEach(cleanup);

const httpClient = {
  get: async () => ({ data: [], status: 200, headers: new Headers(), response: {} as Response }),
  post: async () => ({ data: {}, status: 200, headers: new Headers(), response: {} as Response }),
  patch: async () => ({ data: {}, status: 200, headers: new Headers(), response: {} as Response }),
  delete: async () => ({ data: {}, status: 200, headers: new Headers(), response: {} as Response }),
} as unknown as CoreHttpClient;

const store: ResourceStore = {
  load: async () => ({ data: [], totalCount: 0, summary: null }),
};

const headerFields = [
  identityField().build(),
  textField().name('numero').label('Número').visibleOnForm(false).build(),
];

const visibleHeaderFields = [
  identityField().build(),
  textField().name('customer').label('Customer').build(),
];

const detailFields = [numberField().name('peso').label('Peso').build()];

function renderForm(
  props: Partial<React.ComponentProps<typeof NativeFormView>> &
    Pick<React.ComponentProps<typeof NativeFormView>, 'fields'>,
) {
  return render(
    <CoreHttpProvider client={httpClient}>
      <CoreRuntimeProvider>
        <ResourceStoreProvider factory={() => store}>
          <NativeFormView url="/api/orders" {...props} />
        </ResourceStoreProvider>
      </CoreRuntimeProvider>
    </CoreHttpProvider>,
  );
}

describe('NativeFormView master-detail layout', () => {
  it('marks a form with lines and no visible header fields as detail-only', () => {
    const { container } = renderForm({
      fields: headerFields,
      detailFields,
      presentationContext: { presentationMode: 'drawer', drawerWidth: 880 },
    });

    const form = container.querySelector('.nb-form');
    expect(form?.className).toContain('nb-form--with-detail');
    expect(form?.className).toContain('nb-form--detail-only');
    expect(form?.className).toContain('nb-form--drawer');
    expect(container.querySelector('.nb-form__master-panel')).toBeNull();
    expect(container.querySelector('.nb-form__detail-panel')).not.toBeNull();
  });

  it('keeps the master panel when a header field is visible', () => {
    const { container } = renderForm({
      fields: visibleHeaderFields,
      detailFields,
      presentationContext: { presentationMode: 'drawer', drawerWidth: 880 },
    });

    const form = container.querySelector('.nb-form');
    expect(form?.className).toContain('nb-form--with-detail');
    expect(form?.className).not.toContain('nb-form--detail-only');
    expect(container.querySelector('.nb-form__master-panel')).not.toBeNull();
    expect(container.querySelector('.nb-form__master-panel')?.textContent).toContain('Customer');
  });

  it('tags page-mode forms so CSS can keep the two-column split', () => {
    const { container } = renderForm({
      fields: visibleHeaderFields,
      detailFields,
      presentationContext: { presentationMode: 'page' },
    });

    expect(container.querySelector('.nb-form')?.className).toContain('nb-form--page');
    expect(container.querySelector('.nb-form__master-panel')).not.toBeNull();
  });
});
