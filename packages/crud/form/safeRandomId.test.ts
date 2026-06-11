import { afterEach, describe, expect, it, vi } from 'vitest';
import { safeRandomId } from './safeRandomId';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('safeRandomId', () => {
  it('uses crypto.randomUUID when available', () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'fixed-uuid' });
    expect(safeRandomId()).toBe('fixed-uuid');
  });

  it('falls back to a token when crypto.randomUUID is unavailable', () => {
    vi.stubGlobal('crypto', {});
    const id = safeRandomId();
    expect(id).toMatch(/^rid-/);
    expect(id.length).toBeGreaterThan(8);
  });

  it('falls back when crypto is undefined entirely', () => {
    vi.stubGlobal('crypto', undefined);
    expect(safeRandomId()).toMatch(/^rid-/);
  });

  it('produces unique values across calls in fallback mode', () => {
    vi.stubGlobal('crypto', {});
    const ids = new Set(Array.from({ length: 200 }, () => safeRandomId()));
    expect(ids.size).toBe(200);
  });
});
