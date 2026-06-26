import { useMemo, useState, type ReactNode } from 'react';
import { Chip } from './Chip';
import { SegmentedControl, type SegmentedControlOption } from './SegmentedControl';
import { TextField } from './FormControls';
import './FilterPanel.scss';

export interface FilterPanelChipOption {
  key: string;
  label: ReactNode;
}

export interface FilterPanelCategorySection {
  title: string;
  options: FilterPanelChipOption[];
  selectedKey: string | null;
  onSelect: (key: string | null) => void;
  allLabel?: string;
  searchThreshold?: number;
  searchPlaceholder?: string;
  emptyMessage?: string;
  ariaLabel: string;
}

export interface FilterPanelStatusSection<T extends string = string> {
  title: string;
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}

export type FilterPanelLayout = 'stacked' | 'toolbar';
export type FilterPanelDensity = 'default' | 'compact';

export interface FilterPanelProps<T extends string = string> {
  category: FilterPanelCategorySection;
  status?: FilterPanelStatusSection<T>;
  layout?: FilterPanelLayout;
  density?: FilterPanelDensity;
  className?: string;
  testId?: string;
}

export function FilterPanel<T extends string = string>({
  category,
  status,
  layout = 'stacked',
  density = 'default',
  className = '',
  testId,
}: FilterPanelProps<T>) {
  const [search, setSearch] = useState('');
  const threshold = category.searchThreshold ?? 10;
  const showSearch = category.options.length > threshold;

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return category.options;
    return category.options.filter((option) =>
      String(option.label).toLowerCase().includes(query),
    );
  }, [category.options, search]);

  const layoutClass = layout === 'toolbar' ? ' nb-filter-panel--toolbar' : '';
  const densityClass = density === 'compact' ? ' nb-filter-panel--compact' : '';

  const categoryChips = (
    <div className="nb-filter-panel__chips" role="group" aria-label={category.ariaLabel}>
      <Chip
        label={category.allLabel ?? 'Todas'}
        active={category.selectedKey === null}
        size="sm"
        onClick={() => category.onSelect(null)}
      />
      {filteredOptions.map((option) => (
        <Chip
          key={option.key}
          label={option.label}
          active={category.selectedKey === option.key}
          size="sm"
          onClick={() => category.onSelect(option.key)}
        />
      ))}
      {showSearch && filteredOptions.length === 0 && (
        <span className="nb-filter-panel__empty">{category.emptyMessage ?? 'Sin coincidencias'}</span>
      )}
    </div>
  );

  if (layout === 'toolbar') {
    return (
      <div
        className={`nb-filter-panel${layoutClass}${densityClass}${className ? ` ${className}` : ''}`}
        data-testid={testId}
      >
        <div className="nb-filter-panel__toolbar">
          <span className="nb-filter-panel__title">{category.title}</span>
          {showSearch && (
            <div className="nb-filter-panel__search">
              <TextField
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={category.searchPlaceholder ?? 'Buscar…'}
                aria-label={category.searchPlaceholder ?? 'Buscar'}
              />
            </div>
          )}
          <div className="nb-filter-panel__scroll nb-filter-panel__scroll--grow">{categoryChips}</div>
          {status && (
            <>
              <span className="nb-filter-panel__title nb-filter-panel__title--status">{status.title}</span>
              <SegmentedControl
                options={status.options}
                value={status.value}
                onChange={status.onChange}
                ariaLabel={status.ariaLabel}
                size="sm"
              />
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`nb-filter-panel${layoutClass}${densityClass}${className ? ` ${className}` : ''}`}
      data-testid={testId}
    >
      <div className="nb-filter-panel__section">
        <div className="nb-filter-panel__head">
          <span className="nb-filter-panel__title">{category.title}</span>
          {showSearch && (
            <div className="nb-filter-panel__search">
              <TextField
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={category.searchPlaceholder ?? 'Buscar…'}
                aria-label={category.searchPlaceholder ?? 'Buscar'}
              />
            </div>
          )}
        </div>
        <div className="nb-filter-panel__scroll">{categoryChips}</div>
      </div>

      {status && (
        <div className="nb-filter-panel__section nb-filter-panel__section--status">
          <span className="nb-filter-panel__title">{status.title}</span>
          <SegmentedControl
            options={status.options}
            value={status.value}
            onChange={status.onChange}
            ariaLabel={status.ariaLabel}
            size="sm"
          />
        </div>
      )}
    </div>
  );
}