import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useToolbarOverflow } from './useToolbarOverflow';

const ref = { current: null };

describe('useToolbarOverflow', () => {
  it('keeps every action inline when there is no cap and nothing to measure', () => {
    const { result } = renderHook(() => useToolbarOverflow(ref, 3, undefined));
    expect(result.current).toBe(0);
  });

  it('moves the actions beyond the cap into the overflow', () => {
    const { result } = renderHook(() => useToolbarOverflow(ref, 4, 2));
    expect(result.current).toBe(2);
  });

  it('never hides more actions than exist', () => {
    const { result } = renderHook(() => useToolbarOverflow(ref, 2, 0));
    expect(result.current).toBe(2);
  });
});
