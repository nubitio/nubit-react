import type { DataRecord } from '@nubit/core';
import type { ResourceConfig, ResourceFormDetail, ResourceGridDetail } from './ResourceConfig';

export interface ResolvedResourceDetails {
  gridDetail?: ResourceGridDetail;
  formDetail?: ResourceFormDetail;
}

export function resolveResourceDetails<T extends DataRecord>(
  resource: ResourceConfig<T>,
): ResolvedResourceDetails {
  return {
    gridDetail: resource.gridDetail,
    formDetail: resource.formDetail,
  };
}
