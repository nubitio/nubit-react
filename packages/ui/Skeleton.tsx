import './Skeleton.scss';

export interface SkeletonProps {
  /** Rendered shape. */
  variant?: 'text' | 'rect' | 'circle';
  /** Explicit width (number = px, string = any CSS value). */
  width?: number | string;
  /** Explicit height (number = px, string = any CSS value). */
  height?: number | string;
  /** Number of text skeleton lines to render. Only used when variant="text". */
  lines?: number;
  className?: string;
}

const fmtSize = (v?: number | string) =>
  v === undefined ? undefined : typeof v === 'number' ? `${v}px` : v;

export const Skeleton = ({
  variant = 'rect',
  width,
  height,
  lines = 1,
  className,
}: SkeletonProps) => {
  const base = [
    'nb-skeleton',
    `nb-skeleton--${variant}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (variant === 'text' && lines > 1) {
    return (
      <div className="nb-skeleton-lines">
        {Array.from({ length: lines }).map((_, i) => (
          <span
            key={i}
            className={base}
            style={{
              width: i === lines - 1 ? '70%' : fmtSize(width) ?? '100%',
            }}
            aria-hidden="true"
          />
        ))}
      </div>
    );
  }

  return (
    <span
      className={base}
      style={{ width: fmtSize(width), height: fmtSize(height) }}
      aria-hidden="true"
    />
  );
};
