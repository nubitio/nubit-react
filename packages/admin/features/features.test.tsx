import { cleanup, render, renderHook, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { StaticSessionProvider, type SessionProfile } from '../auth/SessionContext';
import { useFeature, useFeatureConfig } from '../hooks/useFeature';
import { FeatureGate } from './FeatureGate';

afterEach(cleanup);

const profile: SessionProfile = {
  username: 'ana',
  roles: ['ROLE_USER'],
  features: {
    reports: { enabled: true, config: { max: 5 } },
    exports: { enabled: false, config: { max: 9 } },
  },
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <StaticSessionProvider profile={profile}>{children}</StaticSessionProvider>
);

describe('useFeature', () => {
  it('reports an enabled entitlement', () => {
    expect(renderHook(() => useFeature('reports'), { wrapper }).result.current).toBe(true);
  });

  it('treats disabled and unknown features as off', () => {
    expect(renderHook(() => useFeature('exports'), { wrapper }).result.current).toBe(false);
    expect(renderHook(() => useFeature('nope'), { wrapper }).result.current).toBe(false);
  });
});

describe('useFeatureConfig', () => {
  it('exposes the config of an enabled feature only', () => {
    expect(renderHook(() => useFeatureConfig('reports'), { wrapper }).result.current).toEqual({
      max: 5,
    });
    // A disabled feature must not leak its limits.
    expect(renderHook(() => useFeatureConfig('exports'), { wrapper }).result.current).toEqual({});
    expect(renderHook(() => useFeatureConfig('nope'), { wrapper }).result.current).toEqual({});
  });
});

describe('FeatureGate', () => {
  it('renders the children of an enabled feature untouched', () => {
    const { container } = render(
      <StaticSessionProvider profile={profile}>
        <FeatureGate featureKey="reports">
          <button>Run</button>
        </FeatureGate>
      </StaticSessionProvider>,
    );

    expect(screen.getByRole('button', { name: 'Run' })).toBeTruthy();
    expect(container.querySelector('.feature-gate--locked')).toBeNull();
  });

  it('locks a feature the plan does not include', () => {
    const { container } = render(
      <StaticSessionProvider profile={profile}>
        <FeatureGate featureKey="exports" lockTooltip="Not in your plan">
          <button>Export</button>
        </FeatureGate>
      </StaticSessionProvider>,
    );

    expect(container.querySelector('.feature-gate--locked')).not.toBeNull();
    expect(screen.getByTitle('Not in your plan')).toBeTruthy();
  });
});
