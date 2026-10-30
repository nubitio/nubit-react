import React from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, render, fireEvent, screen, act, waitFor } from '@testing-library/react';
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

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

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
  it('renders columns with one control per field and updates supplementary content', () => {
    const { container } = renderForm({
      fields: [
        textField().name('name').label('Name').build(),
        numberField().name('price').label('Price').build(),
        textField().name('notes').label('Notes').build(),
      ],
      presentationContext: { presentationMode: 'page' },
      formLayout: {
        type: 'columns',
        main: [
          {
            label: 'General',
            description: 'Main information',
            fields: ['name', 'price'],
            renderAfter: (data) => <output>Value: {String(data.price ?? '')}</output>,
          },
        ],
        aside: [{ label: 'Additional', fields: ['notes', 'name'] }],
      },
    });
    expect(container.querySelector('.nb-form--columns')).not.toBeNull();
    expect(screen.getAllByLabelText('Name')).toHaveLength(1);
    expect(container.querySelector('.nb-form__column--aside')?.textContent).toContain('Notes');
    fireEvent.change(screen.getByLabelText('Price'), { target: { value: '25' } });
    expect(screen.getByText('Value: 25')).toBeDefined();
  });
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

describe('NativeFormView validation and submission', () => {
  it('reveals the first invalid tab, focuses its field and associates help and error text', async () => {
    const ref = React.createRef<import('./FormHandle').FormHandle>();
    renderForm({
      ref,
      fields: [
        textField().name('notes').label('Notes').build(),
        textField()
          .name('name')
          .label('Name')
          .required(true)
          .helpText('Use the public name.')
          .build(),
      ],
      formLayout: {
        type: 'tabs',
        tabs: [
          { label: 'Notes', fields: ['notes'] },
          { label: 'Identity', fields: ['name'] },
        ],
      },
    });
    await act(async () => {
      ref.current!.save();
    });
    const input = screen.getByLabelText('Name');
    expect(document.activeElement).toBe(input);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const description = input
      .getAttribute('aria-describedby')!
      .split(' ')
      .map((id) => document.getElementById(id)?.textContent)
      .join(' ');
    expect(description).toContain('Use the public name.');
    expect(description).toMatch(/required/i);
    fireEvent.change(input, { target: { value: 'Customer' } });
    expect(input.getAttribute('aria-invalid')).toBeNull();
    expect(input.getAttribute('aria-describedby')).toBe('nb-form-name-hint');
  });

  it('keeps one request in flight and permits retry after a server validation error', async () => {
    let reject!: (error: unknown) => void;
    const post = vi.spyOn(httpClient, 'post').mockImplementationOnce(
      () =>
        new Promise((_resolve, fail) => {
          reject = fail;
        }),
    );
    const ref = React.createRef<import('./FormHandle').FormHandle>();
    renderForm({ ref, fields: [textField().name('name').label('Name').build()] });
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Existing name' } });
    await act(async () => {
      ref.current!.save();
      ref.current!.save();
    });
    expect(post).toHaveBeenCalledTimes(1);
    await act(async () => {
      reject({
        status: 422,
        data: { violations: [{ propertyPath: 'name', message: 'Name already exists' }] },
      });
    });
    await waitFor(() => expect(screen.getByText('Name already exists')).toBeDefined());
    expect(document.activeElement).toBe(screen.getByLabelText('Name'));
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Existing name');
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Corrected name' } });
    await act(async () => {
      ref.current!.save();
    });
    expect(post).toHaveBeenCalledTimes(2);
  });
});

it('keeps only the latest async field action and clears feedback when its value changes', async () => {
  const completions: (() => void)[] = [];
  const lookup = vi.fn(async (_event, form) => {
    const value = form.getFieldValue('code');
    await new Promise<void>((resolve) => completions.push(resolve));
    if (form.isCurrent()) form.setFieldValue('name', `Name ${value}`);
    return { tone: 'success' as const, message: `Found ${value}` };
  });
  renderForm({
    fields: [
      textField()
        .name('code')
        .label('Code')
        .buttons([{ name: 'lookup', options: { text: 'Lookup', onClick: lookup } }])
        .build(),
      textField().name('name').label('Name').build(),
    ],
  });
  const code = screen.getByLabelText('Code');
  const button = screen.getByRole('button', { name: 'Lookup' });
  fireEvent.change(code, { target: { value: 'A' } });
  fireEvent.click(button);
  expect((button as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(button);
  expect(lookup).toHaveBeenCalledTimes(1);
  fireEvent.change(code, { target: { value: 'B' } });
  expect((button as HTMLButtonElement).disabled).toBe(false);
  fireEvent.click(button);
  await act(async () => completions[1]());
  expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Name B');
  expect(screen.getByRole('status').textContent).toBe('Found B');
  await act(async () => completions[0]());
  expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Name B');
  expect(screen.queryByText('Found A')).toBeNull();
  fireEvent.change(code, { target: { value: 'C' } });
  expect(screen.queryByRole('status')).toBeNull();
});

it('shows an inline action error and allows retry', async () => {
  const lookup = vi
    .fn()
    .mockRejectedValueOnce(new Error('internal details'))
    .mockResolvedValueOnce({ tone: 'success', message: 'Found' });
  renderForm({
    fields: [
      textField()
        .name('code')
        .label('Code')
        .buttons([{ name: 'lookup', options: { text: 'Lookup', onClick: lookup } }])
        .build(),
    ],
  });
  fireEvent.click(screen.getByRole('button', { name: 'Lookup' }));
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Try again'));
  expect(screen.queryByText('internal details')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Lookup' }));
  await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Found'));
});
