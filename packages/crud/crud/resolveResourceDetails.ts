import type { DataRecord } from '@nubitio/core';
import type { ResourceConfig, ResourceFormDetail, ResourceGridDetail } from './ResourceConfig';
import { buildFields } from '../field/buildFields';
import type { FieldInput } from '../field/buildFields';
import type { Field } from '../field/Field';

/** Detail configs with the field arrays normalized to plain Fields. */
export type ResolvedGridDetail = Omit<ResourceGridDetail, 'fields'> & {
  fields: Field[] | ((parentRow: DataRecord) => Field[]);
};
export type ResolvedFormDetail = Omit<ResourceFormDetail, 'fields'> & { fields: Field[] };

export interface ResolvedResourceDetails {
  gridDetail?: ResolvedGridDetail;
  formDetail?: ResolvedFormDetail;
}

export function resolveResourceDetails<T extends DataRecord>(
  resource: ResourceConfig<T>,
): ResolvedResourceDetails {
  const { gridDetail, formDetail } = resource;

  return {
    gridDetail: gridDetail && {
      ...gridDetail,
      fields:
        typeof gridDetail.fields === 'function'
          ? (parentRow: DataRecord) =>
              buildFields((gridDetail.fields as (row: DataRecord) => FieldInput[])(parentRow))
          : buildFields(gridDetail.fields),
    },
    formDetail: formDetail && {
      ...formDetail,
      fields: formDetail.fields ? buildFields(formDetail.fields) : [],
    },
  };
}
