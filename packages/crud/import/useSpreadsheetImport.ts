import { useCallback, useState } from 'react';
import { useCoreHttpClient } from '@nubitio/core';

export interface ImportError {
  line: number;
  field: string;
  message: string;
}

export interface ImportReport {
  rows: number;
  valid: number;
  invalid: number;
  inserts: number;
  updates: number;
  errorCount: number;
  errors: ImportError[];
  truncatedErrors: boolean;
  applied: boolean;
  headers?: string[];
  mapping?: Record<string, number>;
  unmapped?: string[];
}

export interface ImportSession {
  id: string;
  resource: string;
  filename: string;
  status: 'uploaded' | 'analyzed' | 'applied' | 'failed';
  numberFormat: string;
  mapping: Record<string, number>;
  report: ImportReport;
  createdAt: string;
  appliedAt: string | null;
  createdBy: string | null;
}

export type ImportState =
  | { status: 'idle' }
  | { status: 'analyzing' }
  | { status: 'reviewing'; session: ImportSession }
  | { status: 'applying'; session: ImportSession }
  | { status: 'applied'; session: ImportSession }
  | { status: 'error'; message: string };

/**
 * Drives the two-step import: analyse, then apply.
 *
 * The steps are separate here because they are separate on the server, and
 * because collapsing them in the client would defeat the point — the user has
 * to be able to see what a file does before it does it. Nothing in this hook
 * can apply a file that was not analysed first.
 */
export function useSpreadsheetImport(uploadUrl: string) {
  const httpClient = useCoreHttpClient();
  const [state, setState] = useState<ImportState>({ status: 'idle' });

  const analyze = useCallback(
    async (file: File, numberFormat: string = 'auto'): Promise<void> => {
      setState({ status: 'analyzing' });

      const body = new FormData();
      body.append('file', file);
      body.append('numberFormat', numberFormat);

      try {
        const response = await httpClient.post<ImportSession>(uploadUrl, body);
        setState({ status: 'reviewing', session: response.data });
      } catch (error) {
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : 'The file could not be processed.',
        });
      }
    },
    [httpClient, uploadUrl],
  );

  const confirm = useCallback(async (): Promise<void> => {
    if (state.status !== 'reviewing') return;

    const { session } = state;
    setState({ status: 'applying', session });

    try {
      const response = await httpClient.post<ImportSession>(
        `/api/imports/${session.id}/confirm`,
        {},
      );
      setState({ status: 'applied', session: response.data });
    } catch (error) {
      setState({
        status: 'error',
        message: error instanceof Error ? error.message : 'The import could not be applied.',
      });
    }
  }, [httpClient, state]);

  const reset = useCallback(() => setState({ status: 'idle' }), []);

  return { state, analyze, confirm, reset };
}
