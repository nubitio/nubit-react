import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { QuotaUsageBanner } from './QuotaUsageBanner';
import { parseQuotaError, quotaErrorToastMessage } from './parseQuotaError';

afterEach(cleanup);

describe('parseQuotaError', () => {
  it('reads resource, usage and limit from the API detail', () => {
    const parsed = parseQuotaError({
      status: 429,
      data: { detail: 'Quota exceeded for "users": 5/5' },
    });

    expect(parsed).toEqual({
      resource: 'users',
      current: 5,
      limit: 5,
      message: 'Quota exceeded for "users": 5/5',
    });
  });

  it('prefers detail, then message, then the error message', () => {
    const fromMessage = parseQuotaError({ status: 429, data: { message: 'msg' } });
    const fromError = parseQuotaError({ status: 429, message: 'boom' });

    expect(fromMessage?.message).toBe('msg');
    expect(fromError?.message).toBe('boom');
  });

  it('degrades to an unknown quota when the detail does not match the format', () => {
    expect(parseQuotaError({ status: 429, data: { detail: 'slow down' } })).toEqual({
      resource: 'unknown',
      current: 0,
      limit: 0,
      message: 'slow down',
    });
    expect(parseQuotaError({ status: 429 })?.message).toBe('Plan limit reached.');
  });

  it('ignores anything that is not a 429', () => {
    expect(parseQuotaError({ status: 500, data: { detail: 'Quota exceeded for "a": 1/1' } })).toBe(
      null,
    );
    expect(parseQuotaError(null)).toBe(null);
    expect(parseQuotaError('429')).toBe(null);
  });

  it('builds a toast message, using a label when one is provided', () => {
    const quota = { resource: 'users', current: 3, limit: 3, message: '' };

    expect(quotaErrorToastMessage(quota)).toBe(
      'Plan limit reached: 3/3 users. Upgrade your plan to continue.',
    );
    expect(quotaErrorToastMessage(quota, { users: 'seats' })).toContain('3/3 seats');
  });
});

describe('QuotaUsageBanner', () => {
  it('renders nothing when the plan has no limit', () => {
    const { container } = render(<QuotaUsageBanner count={2} max={0} unitLabel="users" />);

    expect(container.firstChild).toBeNull();
  });

  it('shows plain usage well below the limit, without an upgrade link', () => {
    render(<QuotaUsageBanner count={1} max={5} unitLabel="users" upgradeHref="/plans" />);

    expect(screen.getByRole('status').className).toContain('nb-quota-banner--default');
    expect(screen.getByText('1 / 5 users')).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('warns and offers an upgrade with one slot left', () => {
    render(
      <QuotaUsageBanner count={4} max={5} unitLabel="user" planLabel="Pro" upgradeHref="/plans" />,
    );

    expect(screen.getByRole('status').className).toContain('nb-quota-banner--warn');
    expect(screen.getByText('Only 1 user slot left on your Pro.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'View plans' }).getAttribute('href')).toBe('/plans');
  });

  it('flags the limit, and lets the caller word every state', () => {
    render(
      <QuotaUsageBanner
        count={5}
        max={5}
        unitLabel="users"
        atLimitMessage="Full."
        upgradeHref="/plans"
        upgradeLabel="Upgrade"
      />,
    );

    expect(screen.getByRole('status').className).toContain('nb-quota-banner--limit');
    expect(screen.getByText('Full.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Upgrade' })).toBeTruthy();
  });
});
