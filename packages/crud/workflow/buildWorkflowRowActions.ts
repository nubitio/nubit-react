import type { DataRecord } from '@nubitio/core';
import type { WorkflowSchema } from '@nubitio/hydra';
import type { ResourceToolbarAction } from '../crud/ResourceConfig';

export function buildWorkflowRowActions<T extends DataRecord = DataRecord>(
  row: T,
  workflow: WorkflowSchema | undefined,
  apiUrl: string,
  roles: string[],
  onDone?: () => void,
): ResourceToolbarAction[] {
  if (!workflow) {
    return [];
  }

  const current = String(row[workflow.field] ?? '');

  return workflow.transitions
    .filter((transition) => transition.from.includes(current))
    .filter(
      (transition) =>
        !transition.roles?.length ||
        transition.roles.some((role) => roles.includes(role)),
    )
    .map((transition) => ({
      text: transition.label ?? transition.name,
      onClick: async () => {
        const base = apiUrl.replace(/\/$/, '');
        const id = row.id;
        await fetch(`${base}/${id}/transition/${transition.name}`, {
          method: 'POST',
          credentials: 'include',
        });
        onDone?.();
      },
    }));
}