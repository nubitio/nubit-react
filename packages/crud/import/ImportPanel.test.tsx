/**
 * The import panel — the dry-run gate.
 *
 * The interesting property is not that a file can be imported; it is that the
 * panel cannot apply one that was not analysed first, and refuses to offer
 * apply at all while any row is invalid. The server rejects a partial import
 * outright, so a button that looks available and always fails would train
 * users to distrust the screen.
 *
 * These tests drive the panel through a fake HTTP client, which is the same
 * seam the real one talks to.
 */
import React from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { CoreHttpProvider, initCoreI18n, type CoreHttpClient } from '@nubitio/core';

import { ImportPanel } from './ImportPanel';
import type { ImportReport, ImportSession } from './useSpreadsheetImport';

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

function report(over: Partial<ImportReport> = {}): ImportReport {
  return {
    rows: 10,
    valid: 10,
    invalid: 0,
    inserts: 7,
    updates: 3,
    errorCount: 0,
    errors: [],
    truncatedErrors: false,
    applied: false,
    ...over,
  };
}

function session(over: Partial<ImportSession> = {}): ImportSession {
  return {
    id: 'imp_1',
    resource: '/api/products',
    filename: 'products.csv',
    status: 'analyzed',
    numberFormat: 'auto',
    mapping: {},
    report: report(),
    createdAt: '2026-08-01T10:00:00Z',
    appliedAt: null,
    createdBy: null,
    ...over,
  };
}

const ok = (data: unknown) => ({
  data,
  status: 200,
  headers: new Headers(),
  response: {} as Response,
});

function renderPanel(post: ReturnType<typeof vi.fn>, onApplied?: () => void) {
  const httpClient = {
    get: vi.fn(),
    post,
    patch: vi.fn(),
    delete: vi.fn(),
  } as unknown as CoreHttpClient;

  return render(
    <CoreHttpProvider client={httpClient}>
      <ImportPanel uploadUrl="/api/imports" onApplied={onApplied} />
    </CoreHttpProvider>,
  );
}

/** Drops a file on the panel's file input, which is what starts the dry run. */
function chooseFile(container: HTMLElement, name = 'products.csv') {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File(['sku,name\n1,Widget'], name, { type: 'text/csv' });
  fireEvent.change(input, { target: { files: [file] } });
  return file;
}

describe('before a file is analysed', () => {
  it('offers no way to apply anything', () => {
    const { container } = renderPanel(vi.fn());

    // Nothing has been analysed, so nothing can be written. The confirm button
    // does not exist yet — it is not merely disabled.
    expect(container.querySelector('.nb-import__actions')).toBeNull();
    expect(container.querySelector('input[type="file"]')).not.toBeNull();
  });

  it('sends the chosen number format with the file, rather than guessing later', async () => {
    // "1,234" means two different amounts to two readers, and the file carries
    // no locale. The choice has to travel with the upload.
    const post = vi.fn().mockResolvedValue(ok(session()));
    const { container } = renderPanel(post);

    fireEvent.change(container.querySelector('select') as HTMLSelectElement, {
      target: { value: 'comma' },
    });
    chooseFile(container);

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    const [url, body] = post.mock.calls[0];
    expect(url).toBe('/api/imports');
    expect((body as FormData).get('numberFormat')).toBe('comma');
    expect((body as FormData).get('file')).toBeInstanceOf(File);
  });
});

describe('after a clean analysis', () => {
  it('shows the summary and offers apply', async () => {
    const post = vi.fn().mockResolvedValue(ok(session()));
    const { container } = renderPanel(post);
    chooseFile(container);

    await screen.findByText(/7/);
    const confirm = container.querySelector('.nb-btn--primary') as HTMLButtonElement;
    expect(confirm.disabled).toBe(false);
  });

  it('applies only after an explicit confirm, and against the analysed session', async () => {
    const post = vi
      .fn()
      .mockResolvedValueOnce(ok(session()))
      .mockResolvedValueOnce(ok(session({ status: 'applied', report: report({ applied: true }) })));
    const onApplied = vi.fn();
    const { container } = renderPanel(post, onApplied);

    chooseFile(container);
    await waitFor(() => expect(container.querySelector('.nb-btn--primary')).not.toBeNull());

    // One call so far: the dry run. Rendering the review step must not write.
    expect(post).toHaveBeenCalledTimes(1);

    fireEvent.click(container.querySelector('.nb-btn--primary') as HTMLButtonElement);

    await waitFor(() => expect(post).toHaveBeenCalledTimes(2));
    // The confirm is addressed to the session the user reviewed — not to a
    // fresh upload, which would apply a file nobody looked at.
    expect(post.mock.calls[1][0]).toBe('/api/imports/imp_1/confirm');
    await waitFor(() => expect(onApplied).toHaveBeenCalledTimes(1));
  });
});

describe('after an analysis with invalid rows', () => {
  it('refuses to offer apply and says why', async () => {
    const post = vi.fn().mockResolvedValue(
      ok(
        session({
          report: report({
            valid: 8,
            invalid: 2,
            errorCount: 2,
            errors: [
              { line: 4, field: 'price', message: 'Ambiguous separator' },
              { line: 9, field: 'sku', message: 'Required' },
            ],
          }),
        }),
      ),
    );
    const { container } = renderPanel(post);
    chooseFile(container);

    await waitFor(() => expect(container.querySelector('.nb-btn--primary')).not.toBeNull());
    expect((container.querySelector('.nb-btn--primary') as HTMLButtonElement).disabled).toBe(true);
  });

  it('reports every bad row with its line and column', async () => {
    // A row count alone is unactionable: the user has to know which line to fix.
    const post = vi.fn().mockResolvedValue(
      ok(
        session({
          report: report({
            invalid: 1,
            errorCount: 1,
            errors: [{ line: 42, field: 'price', message: 'Ambiguous separator' }],
          }),
        }),
      ),
    );
    const { container } = renderPanel(post);
    chooseFile(container);

    await waitFor(() =>
      expect(container.querySelectorAll('.nb-import__error-row')).toHaveLength(1),
    );
    const row = container.querySelector('.nb-import__error-row') as HTMLElement;
    expect(row.textContent).toContain('42');
    expect(row.textContent).toContain('price');
    expect(row.textContent).toContain('Ambiguous separator');
  });

  it('names the columns it could not map', async () => {
    // A silently ignored column is how an import looks successful and leaves a
    // field empty in every row.
    const post = vi
      .fn()
      .mockResolvedValue(ok(session({ report: report({ unmapped: ['supplier', 'notes'] }) })));
    const { container } = renderPanel(post);
    chooseFile(container);

    await waitFor(() => expect(container.querySelector('.nb-import__unmapped')).not.toBeNull());
    const unmapped = container.querySelector('.nb-import__unmapped') as HTMLElement;
    expect(unmapped.textContent).toContain('supplier');
    expect(unmapped.textContent).toContain('notes');
  });
});

describe('when the upload fails', () => {
  it('returns to the upload step with the reason, so the file can be retried', async () => {
    const post = vi.fn().mockRejectedValue(new Error('Unsupported file type'));
    const { container } = renderPanel(post);
    chooseFile(container, 'products.pdf');

    await waitFor(() => expect(container.querySelector('.nb-import__error')).not.toBeNull());
    const error = container.querySelector('.nb-import__error') as HTMLElement;
    expect(error.textContent).toContain('Unsupported file type');
    expect(container.querySelector('input[type="file"]')).not.toBeNull();
    expect(container.querySelector('.nb-import__actions')).toBeNull();
  });
});
