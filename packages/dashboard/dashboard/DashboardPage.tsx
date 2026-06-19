import type { CSSProperties } from 'react';
import { AppToolbar } from '@nubitio/ui';
import type { DashboardConfig, DashboardSection } from './types';
import { useDashboardData } from './useDashboardData';
import { WidgetRenderer } from './widgets/WidgetRenderer';
import './DashboardPage.scss';

export interface DashboardPageProps {
  config: DashboardConfig;
}

function sectionClassName(section: DashboardSection): string {
  const layout = section.layout ?? 'grid';
  if (layout === 'grid') {
    const columns =
      typeof section.columns === 'number'
        ? `repeat(${section.columns}, minmax(0, 1fr))`
        : section.columns;
    return columns ? 'nb-dashboard-section nb-dashboard-section--grid' : 'nb-dashboard-section nb-dashboard-section--grid';
  }
  return `nb-dashboard-section nb-dashboard-section--${layout}`;
}

function sectionStyle(section: DashboardSection): CSSProperties | undefined {
  if (section.layout !== 'grid' && section.layout !== undefined) return undefined;
  const columns =
    typeof section.columns === 'number'
      ? `repeat(${section.columns}, minmax(0, 1fr))`
      : section.columns;
  if (!columns) return undefined;
  return { gridTemplateColumns: String(columns) };
}

function DashboardSectionView({
  section,
  data,
  loading,
}: {
  section: DashboardSection;
  data: Record<string, unknown>;
  loading?: boolean;
}) {
  return (
    <section
      className={sectionClassName(section)}
      style={sectionStyle(section)}
      data-section={section.id}
    >
      {section.widgets.map((widget) => (
        <WidgetRenderer key={widget.id} widget={widget} data={data} loading={loading} />
      ))}
    </section>
  );
}

export function DashboardPage({ config }: DashboardPageProps) {
  const fetched = useDashboardData(config.dataUrl, config.refreshInterval);
  const custom = config.useData?.();
  const { data, loading, error, refetch } = custom ?? fetched;

  return (
    <div className="view-wrapper-scroll nb-dashboard-page">
      <AppToolbar title={config.title} onRefresh={refetch}>
        {error && <div className="nb-dashboard-page__error">{error}</div>}
        {config.sections.map((section, index) => (
          <DashboardSectionView
            key={section.id ?? `section-${index}`}
            section={section}
            data={data}
            loading={loading}
          />
        ))}
      </AppToolbar>
      {loading && (
        <div className="nb-dashboard-page__loading" aria-hidden="true">
          <span className="nb-dashboard-page__spinner" />
        </div>
      )}
    </div>
  );
}