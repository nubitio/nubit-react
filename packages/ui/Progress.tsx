import { useId } from 'react';
import type { ProgressHTMLAttributes, ReactNode } from 'react';
import './LoadingIndicators.scss';

export interface ProgressProps extends ProgressHTMLAttributes<HTMLProgressElement> {
  label?: ReactNode;
}

/** Omit value for indeterminate progress; max defaults to 100. */
export function Progress({ label, id, max = 100, className, ...props }: ProgressProps) {
  const generatedId = useId();
  const progressId = id ?? generatedId;
  return (
    <div className="nb-progress-field">
      {label && <label htmlFor={progressId}>{label}</label>}
      <progress
        {...props}
        id={progressId}
        max={max}
        className={`nb-progress${className ? ` ${className}` : ''}`}
      />
    </div>
  );
}
