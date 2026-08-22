import { renderHook, act, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useIssuedDocument } from './useIssuedDocument';

const postMock = vi.fn();
const getMock = vi.fn();

vi.mock('@nubitio/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nubitio/core')>();
  return {
    ...actual,
    useCoreHttpClient: () => ({ post: postMock, get: getMock }),
  };
});

afterEach(() => {
  postMock.mockReset();
  getMock.mockReset();
});

const readyDocument = {
  id: 'doc-1',
  number: 'INV-001',
  status: 'ready' as const,
  mediaType: 'application/pdf',
  byteSize: 1024,
  checksum: 'abc',
  issuedAt: '2026-03-01T04:30:00+00:00',
  issuedBy: 'admin@example.com',
  supersedes: null,
  supersededBy: null,
  failureReason: null,
  downloadUrl: '/api/documents/doc-1/file',
};

describe('useIssuedDocument', () => {
  it('issues against the record-specific url', async () => {
    postMock.mockResolvedValue({ data: readyDocument });

    const { result } = renderHook(() => useIssuedDocument('/api/documents/invoices/{id}', 42));

    await act(async () => {
      await result.current.issue();
    });

    expect(postMock).toHaveBeenCalledWith('/api/documents/invoices/42', {});
    expect(result.current.state).toEqual({ status: 'ready', document: readyDocument });
  });

  it('encodes an identifier that is not a plain number', async () => {
    postMock.mockResolvedValue({ data: readyDocument });

    const { result } = renderHook(() => useIssuedDocument('/api/documents/invoices/{id}', 'a/b c'));

    await act(async () => {
      await result.current.issue();
    });

    expect(postMock).toHaveBeenCalledWith('/api/documents/invoices/a%2Fb%20c', {});
  });

  // A correction supersedes a document somebody may already hold, so it is a
  // separate call rather than a flag the print button could pick up by accident.
  it('asks for a correction on a different url', async () => {
    postMock.mockResolvedValue({ data: readyDocument });

    const { result } = renderHook(() => useIssuedDocument('/api/documents/invoices/{id}', 42));

    await act(async () => {
      await result.current.reissue();
    });

    expect(postMock).toHaveBeenCalledWith('/api/documents/invoices/42?reissue=1', {});
  });

  it('reports a queued document as pending rather than ready', async () => {
    postMock.mockResolvedValue({ data: { ...readyDocument, status: 'pending', checksum: null } });

    const { result } = renderHook(() => useIssuedDocument('/api/documents/invoices/{id}', 42));

    await act(async () => {
      await result.current.issue();
    });

    expect(result.current.state.status).toBe('pending');
  });

  it('surfaces the reason a document could not be produced', async () => {
    postMock.mockResolvedValue({
      data: { ...readyDocument, status: 'failed', failureReason: 'The renderer is unavailable.' },
    });

    const { result } = renderHook(() => useIssuedDocument('/api/documents/invoices/{id}', 42));

    await act(async () => {
      await result.current.issue();
    });

    expect(result.current.state).toEqual({
      status: 'error',
      message: 'The renderer is unavailable.',
    });
  });

  it('does not leave the button spinning when the request fails', async () => {
    postMock.mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useIssuedDocument('/api/documents/invoices/{id}', 42));

    await act(async () => {
      await result.current.issue();
    });

    await waitFor(() => expect(result.current.state.status).toBe('error'));
  });

  it('reads the history from the same url', async () => {
    getMock.mockResolvedValue({ data: { documents: [readyDocument] } });

    const { result } = renderHook(() => useIssuedDocument('/api/documents/invoices/{id}', 42));

    const documents = await result.current.history();

    expect(getMock).toHaveBeenCalledWith('/api/documents/invoices/42');
    expect(documents).toEqual([readyDocument]);
  });
});
