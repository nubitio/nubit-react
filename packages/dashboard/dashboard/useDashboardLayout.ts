import { useCallback, useMemo, useState } from 'react';
import type { DashboardSection, DashboardWidget } from './types';

interface SectionLayout {
  order: string[];
  hidden: string[];
}

type LayoutStore = Record<string, SectionLayout>;

function storageKey(dashboardId: string): string {
  return `nb-dashboard-layout:${dashboardId}`;
}

function readStore(dashboardId: string): LayoutStore {
  try {
    const raw = window.localStorage.getItem(storageKey(dashboardId));
    return raw ? (JSON.parse(raw) as LayoutStore) : {};
  } catch {
    return {};
  }
}

function writeStore(dashboardId: string, store: LayoutStore): void {
  try {
    window.localStorage.setItem(storageKey(dashboardId), JSON.stringify(store));
  } catch {
    // Storage unavailable (private mode, quota) — layout just won't persist.
  }
}

export interface HiddenWidgetEntry {
  sectionId: string;
  widget: DashboardWidget;
}

export interface DashboardLayoutState {
  editMode: boolean;
  setEditMode: (value: boolean) => void;
  getSectionWidgets: (section: DashboardSection, sectionId: string) => DashboardWidget[];
  hiddenWidgets: HiddenWidgetEntry[];
  hideWidget: (sectionId: string, widgetId: string) => void;
  showWidget: (sectionId: string, widgetId: string) => void;
  moveWidget: (sectionId: string, widgetId: string, direction: -1 | 1) => void;
  resetLayout: () => void;
}

export function useDashboardLayout(
  dashboardId: string | undefined,
  sections: DashboardSection[],
  enabled: boolean,
): DashboardLayoutState | undefined {
  const [editMode, setEditMode] = useState(false);
  const id = dashboardId ?? 'dashboard';
  const [store, setStore] = useState<LayoutStore>(() => (enabled ? readStore(id) : {}));

  const updateSection = useCallback(
    (sectionId: string, updater: (current: SectionLayout) => SectionLayout) => {
      setStore((prev) => {
        const current = prev[sectionId] ?? { order: [], hidden: [] };
        const next = { ...prev, [sectionId]: updater(current) };
        writeStore(id, next);
        return next;
      });
    },
    [id],
  );

  const getSectionWidgets = useCallback(
    (section: DashboardSection, sectionId: string): DashboardWidget[] => {
      if (!enabled) return section.widgets;
      const layout = store[sectionId];
      if (!layout) return section.widgets;

      const byId = new Map(section.widgets.map((widget) => [widget.id, widget]));
      const ordered = layout.order.map((wid) => byId.get(wid)).filter((w): w is DashboardWidget => !!w);
      const remaining = section.widgets.filter((widget) => !layout.order.includes(widget.id));
      return [...ordered, ...remaining].filter((widget) => !layout.hidden.includes(widget.id));
    },
    [enabled, store],
  );

  const hideWidget = useCallback(
    (sectionId: string, widgetId: string) => {
      updateSection(sectionId, (current) => ({
        ...current,
        hidden: current.hidden.includes(widgetId) ? current.hidden : [...current.hidden, widgetId],
      }));
    },
    [updateSection],
  );

  const showWidget = useCallback(
    (sectionId: string, widgetId: string) => {
      updateSection(sectionId, (current) => ({
        ...current,
        hidden: current.hidden.filter((wid) => wid !== widgetId),
      }));
    },
    [updateSection],
  );

  const moveWidget = useCallback(
    (sectionId: string, widgetId: string, direction: -1 | 1) => {
      const section = sections.find((s) => (s.id ?? '') === sectionId);
      if (!section) return;
      updateSection(sectionId, (current) => {
        const base = current.order.length ? current.order : section.widgets.map((w) => w.id);
        const index = base.indexOf(widgetId);
        const targetIndex = index + direction;
        if (index === -1 || targetIndex < 0 || targetIndex >= base.length) return current;
        const order = [...base];
        [order[index], order[targetIndex]] = [order[targetIndex], order[index]];
        return { ...current, order };
      });
    },
    [sections, updateSection],
  );

  const resetLayout = useCallback(() => {
    setStore({});
    writeStore(id, {});
  }, [id]);

  const hiddenWidgets = useMemo<HiddenWidgetEntry[]>(() => {
    if (!enabled) return [];
    return sections.flatMap((section) => {
      const sectionId = section.id ?? '';
      const hidden = store[sectionId]?.hidden ?? [];
      return section.widgets
        .filter((widget) => hidden.includes(widget.id))
        .map((widget) => ({ sectionId, widget }));
    });
  }, [enabled, sections, store]);

  if (!enabled) return undefined;

  return { editMode, setEditMode, getSectionWidgets, hiddenWidgets, hideWidget, showWidget, moveWidget, resetLayout };
}
