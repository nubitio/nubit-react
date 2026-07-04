import type { ReactNode } from 'react';
import { joinClasses } from './layoutUtils';
import './Layout.scss';

export type AlertTone = 'danger' | 'warning' | 'info';

export interface AlertProps {
  tone?: AlertTone;
  children: ReactNode;
  className?: string;
}

const ICONS: Record<AlertTone, string> = {
  danger: 'ph-warning-circle',
  warning: 'ph-warning',
  info: 'ph-info',
};

export function Alert({ tone = 'info', children, className }: AlertProps) {
  return (
    <div
      className={joinClasses('nb-alert', `nb-alert--${tone}`, className)}
      role="alert"
    >
      <i className={`ph ${ICONS[tone]}`} aria-hidden />
      <span>{children}</span>
    </div>
  );
}