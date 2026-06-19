import React, { useState } from 'react';
import { Badge } from './Badge';
import { IconButton } from './Button';
import './FeatureGate.scss';

export interface FeatureGateProps {
  featureKey: string;
  children: React.ReactNode;
  enabled?: boolean;
  behavior?: 'lock' | 'upgrade';
  planBadge?: string;
  upgradeMessage?: string;
  upgradeUrl?: string;
  lockTooltip?: string;
}

export function FeatureGate({
  featureKey,
  children,
  enabled = false,
  behavior = 'lock',
  planBadge = 'Pro',
  upgradeMessage,
  upgradeUrl = '/settings',
  lockTooltip = 'Esta función no está disponible en tu plan actual.',
}: FeatureGateProps) {
  void featureKey;

  if (enabled) {
    return <div className="feature-gate">{children}</div>;
  }

  if (behavior === 'upgrade') {
    return (
      <UpgradeGate planBadge={planBadge} upgradeMessage={upgradeMessage} upgradeUrl={upgradeUrl}>
        {children}
      </UpgradeGate>
    );
  }

  return (
    <div className="feature-gate--locked" title={lockTooltip} aria-label={lockTooltip} role="presentation">
      {children}
    </div>
  );
}

function UpgradeGate({
  planBadge,
  upgradeMessage,
  upgradeUrl,
  children,
}: {
  planBadge: string;
  upgradeMessage?: string;
  upgradeUrl: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const message =
    upgradeMessage ??
    `Esta función requiere el plan ${planBadge}. Actualiza tu plan para desbloquearla.`;

  return (
    <div
      className="feature-gate--upgrade"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      {children}
      <span
        role="button"
        tabIndex={0}
        className="feature-gate__badge"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((prev) => !prev);
          }
        }}
      >
        <Badge variant="primary" size="sm" pill>
          {planBadge}
        </Badge>
      </span>
      {open && (
        <div className="feature-gate__prompt" role="dialog">
          <IconButton icon="ph ph-x" label="Cerrar" onClick={() => setOpen(false)} />
          <p>{message}</p>
          <a href={upgradeUrl}>Ver planes</a>
        </div>
      )}
    </div>
  );
}