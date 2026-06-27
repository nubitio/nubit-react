import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseHydraDoc } from './openApiParser';
import { resolveInferredFormDetail } from './resolveInferredFormDetail';

const FIXTURE = '/tmp/efact-docs.jsonld';

describe.skipIf(!existsSync(FIXTURE))('efact purchases inference', () => {
  it('builds line fields from x-embedded-lines', () => {
    const doc = JSON.parse(readFileSync(FIXTURE, 'utf8'));
    const entrypointHrefs = { purchase: '/api/purchases' };
    const map = parseHydraDoc(doc, entrypointHrefs);
    const embeddedLines = map.Purchase?.embeddedLines;

    const result = resolveInferredFormDetail(
      '/api/purchases',
      { propertyName: 'items', allowAdding: true },
      { format: 'hydra', doc, entrypointHrefs },
      embeddedLines,
    );

    expect(result?.url).toBe('/api/goods_receipt_items?purchase={id}');
    expect(result?.fields?.length).toBeGreaterThan(0);
    expect(result?.fields?.map((f) => f.name)).toContain('product');
    expect(result?.fields?.map((f) => f.name)).toContain('qty');
  });
});