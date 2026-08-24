/**
 * Printing and correcting an issued document.
 *
 * The properties worth pinning are the ones an auditor asks about: printing
 * never re-renders (the stored bytes come back), a correction is a distinct
 * act that asks first, and the history shows superseded copies rather than
 * hiding them — "which version did the customer receive?" is the question the
 * archive exists to answer.
 */
import React from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { CoreHttpProvider, initCoreI18n, type CoreHttpClient } from '@nubitio/core';

import { PrintButton } from './PrintButton';
import { DocumentHistoryPanel } from './DocumentHistoryPanel';
import type { IssuedDocument } from './useIssuedDocument';

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
  vi.unstubAllGlobals();
});

function doc(over: Partial<IssuedDocument> = {}): IssuedDocument {
  return {
    id: 'doc_1',
    number: 'INV-2026-0001',
    status: 'ready',
    mediaType: 'application/pdf',
    byteSize: 5120,
    checksum: 'abc123',
    issuedAt: '2026-08-01T10:00:00Z',
    issuedBy: 'grace',
    supersedes: null,
    supersededBy: null,
    failureReason: null,
    downloadUrl: '/api/documents/doc_1/download',
    ...over,
  };
}

const ok = (data: unknown) => ({
  data,
  status: 200,
  headers: new Headers(),
  response: {} as Response,
});

function renderButton(
  post: ReturnType<typeof vi.fn>,
  props: Partial<React.ComponentProps<typeof PrintButton>> = {},
  get: ReturnType<typeof vi.fn> = vi.fn().mockResolvedValue(ok({ documents: [] })),
) {
  const httpClient = { get, post, patch: vi.fn(), delete: vi.fn() } as unknown as CoreHttpClient;

  return render(
    <CoreHttpProvider client={httpClient}>
      <PrintButton issueUrl="/api/invoices/{id}/document" recordId={7} {...props} />
    </CoreHttpProvider>,
  );
}

const printBtn = (c: HTMLElement) => c.querySelector('.nb-btn--secondary') as HTMLButtonElement;
const ghostBtns = (c: HTMLElement) =>
  Array.from(c.querySelectorAll('.nb-btn--ghost')) as HTMLButtonElement[];

describe('printing', () => {
  it('issues against the record and opens the stored copy', async () => {
    const open = vi.fn();
    vi.stubGlobal('open', open);
    const post = vi.fn().mockResolvedValue(ok(doc()));
    const { container } = renderButton(post);

    fireEvent.click(printBtn(container));

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    // The id is interpolated into the template and encoded, not concatenated.
    expect(post.mock.calls[0][0]).toBe('/api/invoices/7/document');
    await waitFor(() => expect(open).toHaveBeenCalledWith(doc().downloadUrl, '_blank', 'noopener'));
  });

  it('does not open a window for a document that is not ready yet', async () => {
    // A queued render has no bytes. Opening optimistically shows the browser's
    // own error page, which tells the user nothing about what happened.
    const open = vi.fn();
    vi.stubGlobal('open', open);
    const post = vi.fn().mockResolvedValue(ok(doc({ status: 'pending', number: null })));
    const { container } = renderButton(post);

    fireEvent.click(printBtn(container));

    await waitFor(() =>
      expect(container.querySelector('.nb-document-actions__status')).not.toBeNull(),
    );
    expect(open).not.toHaveBeenCalled();
  });

  it('surfaces the reason a render failed instead of a blank window', async () => {
    const open = vi.fn();
    vi.stubGlobal('open', open);
    const post = vi
      .fn()
      .mockResolvedValue(ok(doc({ status: 'failed', failureReason: 'Template not found' })));
    const { container } = renderButton(post);

    fireEvent.click(printBtn(container));

    await waitFor(() =>
      expect(container.querySelector('.nb-document-actions__error')).not.toBeNull(),
    );
    expect(
      (container.querySelector('.nb-document-actions__error') as HTMLElement).textContent,
    ).toContain('Template not found');
    expect(open).not.toHaveBeenCalled();
  });
});

describe('correcting', () => {
  it('asks before superseding a copy somebody may already hold', async () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(false));
    vi.stubGlobal('open', vi.fn());
    const post = vi.fn().mockResolvedValue(ok(doc()));
    const { container } = renderButton(post);

    // Second ghost button is the history toggle; the first is the correction.
    fireEvent.click(ghostBtns(container)[0]);

    expect(window.confirm).toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
  });

  it('issues a new copy on a distinct endpoint once confirmed', async () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
    vi.stubGlobal('open', vi.fn());
    const post = vi.fn().mockResolvedValue(ok(doc({ id: 'doc_2', supersedes: 'doc_1' })));
    const { container } = renderButton(post);

    fireEvent.click(ghostBtns(container)[0]);

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    // A correction is a different request, not a flag the print path shares —
    // which is what keeps it from being emitted by accident.
    expect(post.mock.calls[0][0]).toBe('/api/invoices/7/document?reissue=1');
  });

  it('hides the correction action when the resource forbids it', () => {
    const { container } = renderButton(vi.fn(), { allowReissue: false });

    // Only the history toggle remains.
    expect(ghostBtns(container)).toHaveLength(1);
  });
});

describe('document history', () => {
  const renderHistory = (load: () => Promise<IssuedDocument[]>, visible = true): HTMLElement =>
    render(<DocumentHistoryPanel load={load} visible={visible} />).container;

  it('renders nothing at all while closed, and does not load', () => {
    const load = vi.fn().mockResolvedValue([]);
    const container = renderHistory(load, false);

    expect(container.innerHTML).toBe('');
    expect(load).not.toHaveBeenCalled();
  });

  it('lists superseded copies alongside the current one', async () => {
    const container = renderHistory(async () => [
      doc({ id: 'doc_2', number: 'INV-2026-0001-R1' }),
      doc({ id: 'doc_1', supersededBy: 'doc_2' }),
    ]);

    await waitFor(() =>
      expect(container.querySelectorAll('.nb-document-history__item')).toHaveLength(2),
    );
    // The superseded copy is marked, not dropped: an auditor asks which version
    // the customer received, and a list of only the current copy cannot answer.
    expect(container.querySelectorAll('.nb-document-history__item--superseded')).toHaveLength(1);
  });

  it('offers a download only for a copy that has bytes', async () => {
    const container = renderHistory(async () => [
      doc({ id: 'doc_1' }),
      doc({ id: 'doc_2', status: 'pending', number: null }),
    ]);

    await waitFor(() =>
      expect(container.querySelectorAll('.nb-document-history__item')).toHaveLength(2),
    );
    expect(container.querySelectorAll('.nb-document-history__link')).toHaveLength(1);
    expect(container.querySelectorAll('.nb-document-history__status')).toHaveLength(1);
  });

  it('falls back to the internal id when a copy has no number yet', async () => {
    const container = renderHistory(async () => [doc({ number: null })]);

    await waitFor(() =>
      expect(container.querySelector('.nb-document-history__number')).not.toBeNull(),
    );
    expect(
      (container.querySelector('.nb-document-history__number') as HTMLElement).textContent,
    ).toBe('doc_1');
  });

  it('says the archive could not be read rather than showing it as empty', async () => {
    // "No documents" and "we could not check" are different answers, and only
    // one of them means it is safe to issue another copy.
    const container = renderHistory(() => Promise.reject(new Error('boom')));

    await waitFor(() =>
      expect(container.querySelector('.nb-document-history__error')).not.toBeNull(),
    );
    expect(container.querySelector('.nb-document-history__empty')).toBeNull();
  });

  it('reports an archive with no copies as empty', async () => {
    const container = renderHistory(async () => []);

    await waitFor(() =>
      expect(container.querySelector('.nb-document-history__empty')).not.toBeNull(),
    );
  });
});
