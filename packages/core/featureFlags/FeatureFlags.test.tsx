import type { PropsWithChildren } from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  FeatureFlagsProvider,
  StaticFeatureFlagClient,
  useBooleanFlag,
  useNumberFlag,
  useObjectFlag,
  useStringFlag,
} from './FeatureFlags';

describe('feature flags', () => {
  it('returns safe defaults without a provider', () => {
    expect(renderHook(() => useBooleanFlag('new-grid')).result.current).toBe(false);
    expect(renderHook(() => useStringFlag('theme', 'classic')).result.current).toBe('classic');
  });

  it('evaluates typed static values and rejects type mismatches', () => {
    const flags = { enabled: true, theme: 'compact', limit: 25, config: { mode: 'safe' } };
    const wrapper = ({ children }: PropsWithChildren) => (
      <FeatureFlagsProvider flags={flags}>{children}</FeatureFlagsProvider>
    );

    expect(renderHook(() => useBooleanFlag('enabled'), { wrapper }).result.current).toBe(true);
    expect(renderHook(() => useNumberFlag('limit'), { wrapper }).result.current).toBe(25);
    expect(renderHook(() => useObjectFlag('config', {}), { wrapper }).result.current).toEqual({
      mode: 'safe',
    });
    expect(renderHook(() => useBooleanFlag('theme'), { wrapper }).result.current).toBe(false);
  });

  it('accepts vendor adapters through the client contract', () => {
    const client = new StaticFeatureFlagClient({ rollout: 'variant-b' }, { tenantId: 42 });
    const wrapper = ({ children }: PropsWithChildren) => (
      <FeatureFlagsProvider client={client}>{children}</FeatureFlagsProvider>
    );

    expect(renderHook(() => useStringFlag('rollout', 'control'), { wrapper }).result.current).toBe(
      'variant-b',
    );
    expect(client.context.tenantId).toBe(42);
  });
});
