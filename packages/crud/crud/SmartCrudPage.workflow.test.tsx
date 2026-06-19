import { describe, expect, it, vi } from 'vitest';
import { buildWorkflowRowActions } from '../workflow/buildWorkflowRowActions';
import type { WorkflowSchema } from '@nubitio/hydra';

const workflow: WorkflowSchema = {
  field: 'status',
  transitions: [
    { name: 'send_to_kitchen', from: ['open'], to: 'preparing', label: 'Enviar a cocina' },
    { name: 'pay', from: ['served'], to: 'paid', label: 'Cobrar', roles: ['ROLE_WAITER'] },
  ],
};

describe('SmartCrudPage workflow row actions', () => {
  it('exposes transitions matching the current state', () => {
    const actions = buildWorkflowRowActions(
      { id: 7, status: 'open' },
      workflow,
      '/api/orders',
      ['ROLE_USER'],
    );

    expect(actions).toHaveLength(1);
    expect(actions[0]?.text).toBe('Enviar a cocina');
  });

  it('filters transitions by role', () => {
    const actions = buildWorkflowRowActions(
      { id: 7, status: 'served' },
      workflow,
      '/api/orders',
      ['ROLE_USER'],
    );

    expect(actions).toHaveLength(0);
  });

  it('posts to the workflow transition endpoint and refreshes on success', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => '' });
    vi.stubGlobal('fetch', fetchMock);

    const onDone = vi.fn();
    const actions = buildWorkflowRowActions(
      { id: 7, status: 'open' },
      workflow,
      '/api/orders',
      ['ROLE_USER'],
      onDone,
    );

    await actions[0]?.onClick?.();

    expect(fetchMock).toHaveBeenCalledWith('/api/orders/7/transition/send_to_kitchen', {
      method: 'POST',
      credentials: 'include',
    });
    expect(onDone).toHaveBeenCalledOnce();

    vi.unstubAllGlobals();
  });
});