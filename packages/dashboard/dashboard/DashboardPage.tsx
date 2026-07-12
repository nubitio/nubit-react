import type { CSSProperties, ReactNode } from 'react';
import { AppToolbar } from '@nubitio/ui';
import { DashboardLayoutControls } from './DashboardLayoutControls';
import { DashboardPeriodFilter } from './DashboardPeriodFilter';
import { DashboardWidgetSlot } from './DashboardWidgetSlot';
import { DEFAULT_PERIOD_PARAM_NAMES } from './defaults';
import type { DashboardConfig, DashboardPeriodValue, DashboardSection } from './types';
import { useDashboardData } from './useDashboardData';
import { useDashboardLayout, type DashboardLayoutState } from './useDashboardLayout';
import { useDashboardPeriod } from './useDashboardPeriod';
import './DashboardPage.scss';

export interface DashboardPageProps {
  config: DashboardConfig;
}

function sectionClassName(section: DashboardSection): string {
  const layout = section.layout ?? 'grid';
  return `nb-dashboard-section nb-dashboard-section--${layout}`;
}

function sectionStyle(section: DashboardSection): CSSProperties | undefined {
  if (section.layout !== 'grid' && section.layout !== undefined) return undefined;
  const columns =
    typeof section.columns === 'number'
      ? `repeat(${section.columns}, minmax(0, 1fr))`
      : section.columns;
  if (!columns) return undefined;
  // Set via custom property (not `gridTemplateColumns` directly) so the
  // responsive breakpoints in DashboardPage.scss can still override it —
  // an inline style on the property itself would always win the cascade.
  return { '--nb-dashboard-columns': String(columns) } as CSSProperties;
}

function DashboardSectionView({
  section,
  sectionId,
  data,
  loading,
  layout,
  period,
  periodParamNames,
}: {
  section: DashboardSection;
  sectionId: string;
  data: Record<string, unknown>;
  loading?: boolean;
  layout?: DashboardLayoutState;
  period?: DashboardPeriodValue;
  periodParamNames: { start: string; end: string };
}) {
  const widgets = layout ? layout.getSectionWidgets(section, sectionId) : section.widgets;

  return (
    <section
      className={sectionClassName(section)}
      style={sectionStyle(section)}
      data-section={section.id}
    >
      {widgets.map((widget) => (
        <DashboardWidgetSlot
          key={widget.id}
          widget={widget}
          data={data}
          loading={loading}
          editMode={!!layout?.editMode}
          onHide={() => layout?.hideWidget(sectionId, widget.id)}
          onMoveUp={() => layout?.moveWidget(sectionId, widget.id, -1)}
          onMoveDown={() => layout?.moveWidget(sectionId, widget.id, 1)}
          period={period}
          periodParamNames={periodParamNames}
        />
      ))}
    </section>
  );
}

export function DashboardPage({ config }: DashboardPageProps) {
  const period = useDashboardPeriod(config.period);
  const layout = useDashboardLayout(config.id, config.sections, !!config.customizable);
  const fetched = useDashboardData(
    config.dataUrl,
    config.refreshInterval,
    period?.value,
    config.period?.paramNames,
  );
  const custom = config.useData?.(period?.value);
  const { data, loading, error, refetch } = custom ?? fetched;
  const periodParamNames = config.period?.paramNames ?? DEFAULT_PERIOD_PARAM_NAMES;

  const toolbarExtras: ReactNode = (
    <>
      {period && <DashboardPeriodFilter period={period} />}
      {layout && <DashboardLayoutControls layout={layout} />}
    </>
  );

  return (
    <div className="view-wrapper-scroll nb-dashboard-page">
      <AppToolbar title={config.title} onRefresh={refetch} additionalToolbarContent={toolbarExtras}>
        {error && <div className="nb-dashboard-page__error">{error}</div>}
        {config.sections.map((section, index) => {
          const sectionId = section.id ?? `section-${index}`;
          return (
            <DashboardSectionView
              key={sectionId}
              section={section}
              sectionId={sectionId}
              data={data}
              loading={loading}
              layout={layout}
              period={period?.value}
              periodParamNames={periodParamNames}
            />
          );
        })}
      </AppToolbar>
      {loading && (
        <div className="nb-dashboard-page__loading" aria-hidden="true">
          <span className="nb-dashboard-page__spinner" />
        </div>
      )}
    </div>
  );
}
