import type { HTMLAttributes, ReactNode } from 'react';
import { joinClasses } from './layoutUtils';
import './Layout.scss';

export type TextTone = 'default' | 'muted';

export interface TextProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  tone?: TextTone;
  as?: 'span' | 'p';
}

export function Text({ children, tone = 'default', as: Tag = 'span', className, ...props }: TextProps) {
  return (
    <Tag
      className={joinClasses(tone === 'muted' && 'nb-text-muted', className)}
      {...props}
    >
      {children}
    </Tag>
  );
}