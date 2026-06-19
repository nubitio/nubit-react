import type { ReactNode } from 'react';
import './QuotaUsageBanner.scss';

export interface QuotaUsageBannerProps {
  count: number;
  max: number;
  unitLabel: string;
  planLabel?: string;
  atLimitMessage?: string;
  nearLimitMessage?: string;
  defaultMessage?: string;
  upgradeHref?: string;
  upgradeLabel?: string;
  className?: string;
}

export function QuotaUsageBanner({
  count,
  max,
  unitLabel,
  planLabel,
  atLimitMessage,
  nearLimitMessage,
  defaultMessage,
  upgradeHref,
  upgradeLabel = 'View plans',
  className = '',
}: QuotaUsageBannerProps) {
  if (max <= 0) {
    return null;
  }

  const atLimit = count >= max;
  const nearLimit = count === max - 1;
  const tone = atLimit ? 'limit' : nearLimit ? 'warn' : 'default';

  const detail = atLimit
    ? (atLimitMessage ?? `You reached your ${planLabel ?? 'plan'} limit.`)
    : nearLimit
      ? (nearLimitMessage ?? `Only 1 ${unitLabel} slot left on your ${planLabel ?? 'plan'}.`)
      : (defaultMessage ?? `${planLabel ?? 'Plan'} usage.`);

  const upgradeLink = upgradeHref ? (
    <a className="nb-quota-banner__cta" href={upgradeHref}>
      {upgradeLabel}
    </a>
  ) : null;

  return (
    <div
      className={`nb-quota-banner nb-quota-banner--${tone}${className ? ` ${className}` : ''}`}
      role="status"
    >
      <div className="nb-quota-banner__copy">
        <strong>
          {count} / {max} {unitLabel}
        </strong>
        <span>{detail}</span>
      </div>
      {(atLimit || nearLimit) && upgradeLink}
    </div>
  );
}

export function quotaUsageAboveGrid(
  banner: ReactNode,
): () => ReactNode {
  return () => banner;
}