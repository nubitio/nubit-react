import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateCorrelationId } from './correlationId';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('generateCorrelationId', () => {
  it('uses crypto.randomUUID when available', () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'fixed-uuid' });
    expect(generateCorrelationId()).toBe('fixed-uuid');
  });

  it('falls back to a token when crypto.randomUUID is unavailable', () => {
    vi.stubGlobal('crypto', {});
    const id = generateCorrelationId();
    expect(id).toMatch(/^req-/);
    expect(id.length).toBeGreaterThan(8);
  });

  it('falls back when crypto is undefined entirely', () => {
    vi.stubGlobal('crypto', undefined);
    expect(generateCorrelationId()).toMatch(/^req-/);
  });

  it('produces unique values across calls in fallback mode', () => {
    vi.stubGlobal('crypto', {});
    const ids = new Set(Array.from({ length: 200 }, () => generateCorrelationId()));
    expect(ids.size).toBe(200);
  });
});
