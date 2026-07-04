import type { ReactNode } from 'react';
import { joinClasses } from './layoutUtils';
import './Layout.scss';

export interface FormActionsProps {
  children: ReactNode;
  className?: string;
}

export function FormActions({ children, className }: FormActionsProps) {
  return <div className={joinClasses('nb-form-actions', className)}>{children}</div>;
}