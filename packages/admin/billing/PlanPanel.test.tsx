import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlanPanel, type PlanDefinition } from './PlanPanel';

afterEach(cleanup);

const plans: PlanDefinition[] = [
  { id: 'free', name: 'Free', priceLabel: '$0', features: ['1 user'] },
  { id: 'pro', name: 'Pro', priceLabel: '$20', features: ['10 users'], highlighted: true },
];

describe('PlanPanel', () => {
  it('marks the current plan and disables choosing it', () => {
    render(<PlanPanel plans={plans} currentPlanId="free" onSelectPlan={() => undefined} />);

    expect(screen.getAllByText('Current plan')).toHaveLength(2); // badge + button label
    const current = screen.getAllByRole('button', { name: 'Current plan' })[0] as HTMLButtonElement;
    expect(current.disabled).toBe(true);
  });

  it('selects another plan', () => {
    const onSelectPlan = vi.fn();
    render(<PlanPanel plans={plans} currentPlanId="free" onSelectPlan={onSelectPlan} />);

    fireEvent.click(screen.getByRole('button', { name: 'Choose Pro' }));

    expect(onSelectPlan).toHaveBeenCalledWith('pro');
  });

  it('cannot select anything without a handler', () => {
    render(<PlanPanel plans={plans} currentPlanId="free" />);

    expect((screen.getByRole('button', { name: 'Choose Pro' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it('shows progress on the plan being selected', () => {
    render(
      <PlanPanel
        plans={plans}
        currentPlanId="free"
        onSelectPlan={() => undefined}
        selectingPlanId="pro"
        labels={{ selecting: 'Saving…' }}
      />,
    );

    const button = screen.getByRole('button', { name: 'Saving…' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('announces when a trial ends, and only while trialing', () => {
    const { rerender } = render(
      <PlanPanel
        plans={plans}
        currentPlanId="pro"
        subscriptionStatus="trialing"
        trialEndsAt="not-a-date"
      />,
    );
    // An unparseable date is shown as given rather than as "Invalid Date".
    expect(screen.getByText('Trial ends not-a-date')).toBeTruthy();

    rerender(
      <PlanPanel
        plans={plans}
        currentPlanId="pro"
        subscriptionStatus="active"
        trialEndsAt="2030-01-01"
      />,
    );
    expect(screen.queryByText(/Trial ends/)).toBeNull();
  });
});
