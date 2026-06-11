import type { DataRecord } from '@nubit/core';
import type { ResourceConfig, ResourceToolbarContext, ResourceToolbarItems } from './ResourceConfig';

export function resolveResourceToolbar<T extends DataRecord>(
  resource: ResourceConfig<T>,
  context: ResourceToolbarContext<T>,
): ResourceToolbarItems | undefined {
  return typeof resource.toolbar === 'function'
    ? resource.toolbar(context)
    : resource.toolbar;
}
