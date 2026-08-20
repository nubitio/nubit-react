import type { CoreHttpClient, DataRecord } from '@nubitio/core';
import type { WorkflowSchema } from '../schema/ResourceSchema';
import type { ResourceToolbarAction } from '../crud/ResourceConfig';

export function buildWorkflowRowActions<T extends DataRecord = DataRecord>(
  row: T,
  workflow: WorkflowSchema | undefined,
  apiUrl: string,
  roles: string[],
  onDone?: () => void,
  httpClient?: CoreHttpClient,
): ResourceToolbarAction[] {
  if (!workflow) {
    return [];
  }

  const current = String(row[workflow.field] ?? '');

  return workflow.transitions
    .filter((transition) => transition.from.includes(current))
    .filter(
      (transition) =>
        !transition.roles?.length || transition.roles.some((role) => roles.includes(role)),
    )
    .map((transition) => ({
      text: transition.label ?? transition.name,
      onClick: async () => {
        const base = apiUrl.replace(/\/$/, '');
        const id = row.id;
        const transitionUrl = `${base}/${id}/transition/${transition.name}`;

        // Prefer the app's configured CoreHttpClient: it retries once through
        // the app's session-refresh flow on a 401 (an access token can expire
        // between page load and a row action click, especially on long-lived
        // grids) and surfaces the API's JSON error detail directly. Without
        // it, a stale-but-refreshable session fails the transition outright
        // instead of transparently refreshing and retrying — the plain fetch
        // fallback below has no notion of "refresh and retry".
        if (httpClient) {
          await httpClient.post(transitionUrl, undefined);
          onDone?.();
          return;
        }

        const response = await fetch(transitionUrl, {
          method: 'POST',
          credentials: 'include',
        });
        if (!response.ok) {
          const detail = await response.text().catch(() => '');
          throw new Error(detail || `Transition "${transition.name}" failed (${response.status})`);
        }
        onDone?.();
      },
    }));
}
