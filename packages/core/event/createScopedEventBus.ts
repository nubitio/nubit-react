import { createCrudEvents } from './createCrudEvents';
import type { FormEventNames } from '../event/EventTypes';

/**
 * A `FormEventNames` object whose event strings are namespaced with a
 * per-instance scope ID to prevent cross-component event leakage.
 * The extra `_scopeId` property carries the raw 8-char scope token for
 * diagnostics / testing.
 */
export type ScopedFormEventNames = FormEventNames & { readonly _scopeId: string };

/**
 * Creates a scoped event bus for the given resource.
 *
 * Internally this generates an 8-character random scope token and delegates to
 * `createCrudEvents(`${resourceId}:${scopeId}`)`. This means each call produces
 * a unique set of event name strings, even for the same `resourceId`, which
 * prevents accidental cross-instance event coupling when multiple CRUD pages
 * for the same resource are mounted simultaneously.
 *
 * @param resourceId - The resource id (e.g. `'product'`).
 * @returns A `ScopedFormEventNames` object with a stable `_scopeId` tag.
 */
export function createScopedEventBus(resourceId: string): ScopedFormEventNames {
  const scopeId = Math.random().toString(36).slice(2, 10);
  const prefix = `${resourceId}:${scopeId}`;
  const events = createCrudEvents(prefix);
  return { ...events, _scopeId: scopeId };
}
