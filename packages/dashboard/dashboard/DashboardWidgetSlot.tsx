import { DEFAULT_PERIOD_PARAM_NAMES } from './defaults';
import type { DashboardPeriodValue, DashboardWidget } from './types';
import { useWidgetQuery } from './useWidgetQuery';
import { WidgetRenderer } from './widgets/WidgetRenderer';

type Props = {
  widget: DashboardWidget;
  data: Record<string, unknown>;
  loading?: boolean;
  editMode: boolean;
  onHide: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  period?: DashboardPeriodValue;
  periodParamNames?: { start: string; end: string };
};

export function DashboardWidgetSlot({
  widget,
  data,
  loading,
  editMode,
  onHide,
  onMoveUp,
  onMoveDown,
  period,
  periodParamNames = DEFAULT_PERIOD_PARAM_NAMES,
}: Props) {
  // A widget with its own `query` fetches independently — no head-of-line
  // blocking behind the dashboard's shared payload, its own cache entry.
  const widgetQuery = useWidgetQuery(widget.query, period, periodParamNames);
  const effectiveData = widgetQuery ? widgetQuery.data : data;
  const effectiveLoading = widgetQuery ? widgetQuery.loading : loading;

  const body = (
    <>
      {widgetQuery?.error && <div className="nb-dashboard-widget-slot__error">{widgetQuery.error}</div>}
      <WidgetRenderer widget={widget} data={effectiveData} loading={effectiveLoading} />
    </>
  );

  if (!editMode) {
    return body;
  }

  return (
    <div className="nb-dashboard-widget-slot">
      <div className="nb-dashboard-widget-slot__controls">
        <button type="button" className="nb-dashboard-widget-slot__btn" aria-label={`Move ${widget.title} earlier`} onClick={onMoveUp}>
          <i className="ph ph-caret-up" aria-hidden="true" />
        </button>
        <button type="button" className="nb-dashboard-widget-slot__btn" aria-label={`Move ${widget.title} later`} onClick={onMoveDown}>
          <i className="ph ph-caret-down" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="nb-dashboard-widget-slot__btn nb-dashboard-widget-slot__btn--hide"
          aria-label={`Hide ${widget.title}`}
          onClick={onHide}
        >
          <i className="ph ph-eye-slash" aria-hidden="true" />
        </button>
      </div>
      <div className="nb-dashboard-widget-slot__body">{body}</div>
    </div>
  );
}
