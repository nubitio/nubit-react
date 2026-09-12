import { useUiStrings } from './UiStrings';
import './Spinner.scss';

export type SpinnerSize = 'sm' | 'md' | 'lg';

export interface SpinnerProps {
  size?: SpinnerSize;
  /** Accessible name. Defaults to UiStrings.loading. */
  label?: string;
  className?: string;
}

const SIZE_CLASS: Record<SpinnerSize, string> = {
  sm: 'nb-spinner--sm',
  md: 'nb-spinner--md',
  lg: 'nb-spinner--lg',
};

export function Spinner({ size = 'md', label, className }: SpinnerProps) {
  const strings = useUiStrings();
  const name = label ?? strings.loading;

  return (
    <span
      className={['nb-spinner', SIZE_CLASS[size], className].filter(Boolean).join(' ')}
      role="status"
      aria-label={name}
    >
      <span className="nb-spinner__mark" aria-hidden="true" />
    </span>
  );
}
