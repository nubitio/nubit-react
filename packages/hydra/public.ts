// @nubitio/hydra — Hydra/OpenAPI adapter for CRUD schema discovery and data loading.
// Import from this facade only; do not reach into implementation paths.
//
// Requires: <CoreConfigProvider locale="..." timezone="..." apiBaseUrl="..."> from @nubitio/core
// in the app provider tree so that useHydraMetadata and data loading use the correct configuration.

export { HydraRemoteDataSource, createHydraResourceStore } from './HydraRemoteDataSource';
export type {
  RemoteDataSourceOptions,
  RemoteFilterDescriptor,
  RemoteLoadOptions,
  RemoteSortDescriptor,
} from './HydraRemoteDataSource';

export { HydraResourceStoreProvider } from './HydraResourceStoreProvider';
export type { HydraResourceStoreProviderProps } from './HydraResourceStoreProvider';

export { HydraResourceSchemaProvider } from './HydraResourceSchemaProvider';
export type { HydraResourceSchemaProviderProps } from './HydraResourceSchemaProvider';

export {
  parseHydraDoc,
  parseOpenApiDoc,
} from './openApiParser';

export {
  mapHydraSchemaToFields,
  resolveRangeTag,
} from './HydraToFieldMapper';

export {
  useHydraMetadata,
  API_DOC_QUERY_KEY,
} from './useHydraMetadata';

export {
  useResourceSchema,
} from './useResourceSchema';

export {
  SchemaProvider,
  useSchemaContext,
} from './SchemaContext';

export type {
  UseSchemaContextResult,
} from './SchemaContext';

export type {
  HydraApiDoc,
  OpenApiDoc,
  ApiDoc,
  WorkflowSchema,
  WorkflowTransitionSchema,
  SequenceSchema,
} from './types';
