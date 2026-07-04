import { Button } from './Button';
import { joinClasses } from './layoutUtils';
import { useUiStrings } from './UiStrings';
import './DataTable.scss';

export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  ariaLabel?: string;
  /** Maximum page buttons shown (default 7). */
  maxVisible?: number;
  className?: string;
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  ariaLabel,
  maxVisible = 7,
  className,
}: PaginationProps) {
  const strings = useUiStrings();

  if (totalPages <= 1) {
    return null;
  }

  const windowSize = Math.min(maxVisible, totalPages);
  const start = Math.max(1, Math.min(page - Math.floor(windowSize / 2), totalPages - windowSize + 1));
  const pages = Array.from({ length: windowSize }, (_, index) => start + index).filter(
    (value) => value <= totalPages,
  );

  return (
    <nav
      className={joinClasses('nb-pagination', className)}
      aria-label={ariaLabel ?? strings.pages}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={page <= 1}
        aria-label={strings.previousPage}
        onClick={() => onPageChange(page - 1)}
      >
        ←
      </Button>
      {pages.map((value) => (
        <Button
          key={value}
          type="button"
          variant={value === page ? 'primary' : 'ghost'}
          size="sm"
          aria-current={value === page ? 'page' : undefined}
          onClick={() => onPageChange(value)}
        >
          {value}
        </Button>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={page >= totalPages}
        aria-label={strings.nextPage}
        onClick={() => onPageChange(page + 1)}
      >
        →
      </Button>
    </nav>
  );
}