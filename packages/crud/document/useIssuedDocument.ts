import { useCallback, useState } from 'react';
import { useCoreHttpClient } from '@nubitio/core';

/** One issued copy, as the backend publishes it. */
export interface IssuedDocument {
  id: string;
  number: string | null;
  status: 'pending' | 'ready' | 'failed';
  mediaType: string;
  byteSize: number | null;
  checksum: string | null;
  issuedAt: string;
  issuedBy: string | null;
  supersedes: string | null;
  supersededBy: string | null;
  failureReason: string | null;
  downloadUrl: string;
}

export type DocumentState =
  | { status: 'idle' }
  | { status: 'working' }
  | { status: 'ready'; document: IssuedDocument }
  | { status: 'pending'; document: IssuedDocument }
  | { status: 'error'; message: string };

/**
 * Issues and downloads a record's document.
 *
 * Issuing is idempotent on the server, so the button is safe to press twice —
 * the second press returns the copy the first one produced rather than a new
 * one. That is a property of the backend, not of this hook, and the hook is
 * written not to undermine it: nothing here re-issues on retry.
 *
 * `reissue` is a separate call because a correction is a separate act. Making
 * it a flag on the same button is how people emit corrections by accident.
 */
export function useIssuedDocument(issueUrlTemplate: string, recordId: string | number) {
  const httpClient = useCoreHttpClient();
  const [state, setState] = useState<DocumentState>({ status: 'idle' });

  const url = issueUrlTemplate.replace('{id}', encodeURIComponent(String(recordId)));

  const request = useCallback(
    async (target: string): Promise<IssuedDocument | null> => {
      setState({ status: 'working' });

      try {
        const response = await httpClient.post<IssuedDocument>(target, {});
        const document = response.data;

        setState(
          document.status === 'ready'
            ? { status: 'ready', document }
            : document.status === 'pending'
              ? { status: 'pending', document }
              : {
                  status: 'error',
                  message: document.failureReason ?? 'The document could not be produced.',
                },
        );

        return document;
      } catch (error) {
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : 'The document could not be produced.',
        });
        return null;
      }
    },
    [httpClient],
  );

  const issue = useCallback(() => request(url), [request, url]);
  const reissue = useCallback(() => request(`${url}?reissue=1`), [request, url]);

  const history = useCallback(async (): Promise<IssuedDocument[]> => {
    const response = await httpClient.get<{ documents: IssuedDocument[] }>(url);
    return response.data.documents ?? [];
  }, [httpClient, url]);

  return { state, issue, reissue, history, url };
}
