import type { ReactNode } from 'react';
import { Badge, Button } from '@nubitio/ui';
import './PlanPanel.scss';

export interface PlanDefinition {
  id: string;
  name: string;
  priceLabel: string;
  description?: string;
  features: string[];
  highlighted?: boolean;
  ctaLabel?: string;
}

export interface PlanPanelLabels {
  title?: string;
  subtitle?: string;
  currentBadge?: string;
  trialEnds?: string;
  selecting?: string;
}

export interface PlanPanelProps {
  plans: PlanDefinition[];
  currentPlanId: string;
  subscriptionStatus?: string;
  trialEndsAt?: string | null;
  onSelectPlan?: (planId: string) => void | Promise<void>;
  selectingPlanId?: string | null;
  labels?: PlanPanelLabels;
  className?: string;
}

function formatTrialEnds(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

export function PlanPanel({
  plans,
  currentPlanId,
  subscriptionStatus,
  trialEndsAt,
  onSelectPlan,
  selectingPlanId = null,
  labels,
  className = '',
}: PlanPanelProps) {
  const title = labels?.title ?? 'Plans';
  const subtitle = labels?.subtitle ?? 'Choose the plan that fits your team.';
  const currentBadge = labels?.currentBadge ?? 'Current plan';
  const selectingLabel = labels?.selecting ?? 'Updating…';

  let statusLine: ReactNode = null;
  if (subscriptionStatus === 'trialing' && trialEndsAt) {
    const trialTemplate = labels?.trialEnds ?? 'Trial ends {date}';
    statusLine = (
      <p className="nb-plan-panel__status">
        {trialTemplate.replace('{date}', formatTrialEnds(trialEndsAt))}
      </p>
    );
  }

  return (
    <section className={`nb-plan-panel${className ? ` ${className}` : ''}`} aria-labelledby="plan-panel-title">
      <header className="nb-plan-panel__header">
        <div>
          <h2 id="plan-panel-title" className="nb-plan-panel__title">
            {title}
          </h2>
          <p className="nb-plan-panel__subtitle">{subtitle}</p>
          {statusLine}
        </div>
      </header>

      <div className="nb-plan-panel__grid" role="list">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          const isSelecting = selectingPlanId === plan.id;
          const ctaLabel = plan.ctaLabel ?? (isCurrent ? currentBadge : `Choose ${plan.name}`);

          return (
            <article
              key={plan.id}
              role="listitem"
              className={[
                'nb-plan-card',
                plan.highlighted ? 'nb-plan-card--highlighted' : '',
                isCurrent ? 'nb-plan-card--current' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <div className="nb-plan-card__head">
                <h3 className="nb-plan-card__name">{plan.name}</h3>
                {isCurrent ? (
                  <Badge variant="primary" size="sm" pill>
                    {currentBadge}
                  </Badge>
                ) : null}
              </div>
              <p className="nb-plan-card__price">{plan.priceLabel}</p>
              {plan.description ? <p className="nb-plan-card__description">{plan.description}</p> : null}
              <ul className="nb-plan-card__features">
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <Button
                variant={plan.highlighted && !isCurrent ? 'primary' : 'secondary'}
                size="sm"
                disabled={isCurrent || !onSelectPlan || isSelecting}
                onClick={() => void onSelectPlan?.(plan.id)}
              >
                {isSelecting ? selectingLabel : ctaLabel}
              </Button>
            </article>
          );
        })}
      </div>
    </section>
  );
}