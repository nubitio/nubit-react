import { describe, expect, it } from 'vitest';
import {
  DRAWER_WIDTHS,
  DEFAULT_DRAWER_WIDTH,
  resolveDrawerLayoutBucket,
  resolveDrawerWidth,
} from './drawerSizes';

describe('resolveDrawerWidth', () => {
  it('uses explicit drawerWidth when provided', () => {
    expect(resolveDrawerWidth({ drawerSize: 'md', drawerWidth: 880 })).toBe(880);
    expect(resolveDrawerWidth({ drawerWidth: 'min(640px, 50vw)' })).toBe('min(640px, 50vw)');
  });

  it('maps drawerSize tokens to pixel widths', () => {
    expect(resolveDrawerWidth({ drawerSize: 'sm' })).toBe(DRAWER_WIDTHS.sm);
    expect(resolveDrawerWidth({ drawerSize: 'md' })).toBe(DRAWER_WIDTHS.md);
    expect(resolveDrawerWidth({ drawerSize: 'lg' })).toBe(DRAWER_WIDTHS.lg);
    expect(resolveDrawerWidth({ drawerSize: 'xl' })).toBe(DRAWER_WIDTHS.xl);
  });

  it('falls back to the responsive default', () => {
    expect(resolveDrawerWidth()).toBe(DEFAULT_DRAWER_WIDTH);
  });
});

describe('resolveDrawerLayoutBucket', () => {
  it('classifies widths using token boundaries', () => {
    expect(resolveDrawerLayoutBucket(DRAWER_WIDTHS.sm)).toBe('sm');
    expect(resolveDrawerLayoutBucket(DRAWER_WIDTHS.md)).toBe('md');
    expect(resolveDrawerLayoutBucket(DRAWER_WIDTHS.lg)).toBe('lg');
    expect(resolveDrawerLayoutBucket(DRAWER_WIDTHS.xl)).toBe('xl');
    expect(resolveDrawerLayoutBucket('min(880px, 60vw)')).toBe('lg');
    expect(resolveDrawerLayoutBucket(880)).toBe('lg');
  });
});