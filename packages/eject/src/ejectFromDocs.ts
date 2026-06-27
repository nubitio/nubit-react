import { mapHydraSchemaToFields, parseHydraDoc, parseOpenApiDoc } from '@nubitio/hydra';
import type { Field } from '@nubitio/crud';

export interface EjectFieldsResult {
  apiUrl: string;
  className: string;
  fields: Field[];
}

function normalizeUrl(url: string): string {
  const base = url.split('?')[0];
  return base.startsWith('/') ? base.slice(1) : base;
}

export async function ejectFieldsFromDocs(
  apiUrl: string,
  docsUrl: string,
): Promise<EjectFieldsResult> {
  const response = await fetch(docsUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${docsUrl}: ${response.status} ${response.statusText}`);
  }

  const doc = await response.json();
  const isHydra = doc['@type'] === 'ApiDocumentation' || doc['@type'] === 'hydra:ApiDocumentation';
  const resourceMap = isHydra
    ? parseHydraDoc(doc, {})
    : parseOpenApiDoc(doc);

  const normalizedInput = normalizeUrl(apiUrl);
  const resourceSchema = Object.values(resourceMap).find(
    (schema) => normalizeUrl(schema.apiUrl) === normalizedInput,
  );

  if (!resourceSchema) {
    const known = Object.values(resourceMap)
      .map((schema) => schema.apiUrl)
      .join(', ');
    throw new Error(`No schema found for ${apiUrl}. Known: ${known || '(none)'}`);
  }

  const fields = mapHydraSchemaToFields(
    resourceSchema,
    (className) => resourceMap[className]?.apiUrl,
    (className) => resourceMap[className],
  );

  return {
    apiUrl: resourceSchema.apiUrl,
    className: resourceSchema.className,
    fields,
  };
}