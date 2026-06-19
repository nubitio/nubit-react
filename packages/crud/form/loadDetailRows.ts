import type { CoreHttpClient } from '@nubitio/core';
import type { BackendAdapter } from '../adapter/BackendAdapter';
import { HydraAdapter } from '../adapter/HydraAdapter';
import type { FormDataRecord } from './FormDataSnapshot';

/**
 * Loads embedded line rows for formDetail edit mode. Accepts both plain JSON
 * arrays (nubit embedded-lines endpoint) and Hydra collections.
 */
export async function loadDetailRows(
  httpClient: CoreHttpClient,
  detailUrl: string,
  adapter: BackendAdapter | undefined,
): Promise<FormDataRecord[]> {
  const response = await httpClient.get<unknown>(detailUrl);
  const resolvedAdapter = adapter ?? HydraAdapter;
  const { items } = resolvedAdapter.parseListResponse(response.data);

  return items as FormDataRecord[];
}