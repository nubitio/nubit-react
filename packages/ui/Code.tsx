import type { ReactNode } from 'react';
import { joinClasses } from './layoutUtils';
import './Layout.scss';

export interface CodeProps {
  children: ReactNode;
  className?: string;
}

export function Code({ children, className }: CodeProps) {
  return <code className={joinClasses('nb-code', className)}>{children}</code>;
}