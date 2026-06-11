import { createScopedEventBus, type FormEventNames } from '@nubit/core';
import type { ResourceConfig } from './ResourceConfig';
import type { DataRecord } from '@nubit/core';

export type ResolvedCrudResource<T extends DataRecord> = ResourceConfig<T> & {
  events: FormEventNames;
};

export function resolveCrudResource<T extends DataRecord>(
  resource: ResourceConfig<T>,
  overrides: Partial<ResourceConfig<T>> = {},
): ResolvedCrudResource<T> {
  const events = resource.events ?? createScopedEventBus(resource.id);

  return {
    ...resource,
    ...overrides,
    events,
  } as ResolvedCrudResource<T>;
}
