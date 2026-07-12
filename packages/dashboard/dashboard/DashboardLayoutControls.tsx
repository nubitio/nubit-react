import { IconButton, Popover } from '@nubitio/ui';
import type { DashboardLayoutState } from './useDashboardLayout';

export function DashboardLayoutControls({ layout }: { layout: DashboardLayoutState }) {
  return (
    <div className="nb-dashboard-layout-controls">
      {layout.editMode && layout.hiddenWidgets.length > 0 && (
        <Popover
          ariaLabel="Hidden widgets"
          align="end"
          trigger={({ toggle }) => (
            <IconButton
              icon="ph ph-eye-slash"
              label={`Hidden widgets (${layout.hiddenWidgets.length})`}
              onClick={toggle}
            />
          )}
          panel={() => (
            <ul className="nb-dashboard-layout-controls__hidden-list">
              {layout.hiddenWidgets.map(({ sectionId, widget }) => (
                <li key={`${sectionId}-${widget.id}`}>
                  <span>{widget.title}</span>
                  <button
                    type="button"
                    className="nb-dashboard-layout-controls__show-btn"
                    onClick={() => layout.showWidget(sectionId, widget.id)}
                  >
                    Show
                  </button>
                </li>
              ))}
            </ul>
          )}
        />
      )}
      {layout.editMode && (
        <IconButton icon="ph ph-arrow-counter-clockwise" label="Reset layout" onClick={layout.resetLayout} />
      )}
      <IconButton
        icon={layout.editMode ? 'ph ph-check' : 'ph ph-sliders-horizontal'}
        label={layout.editMode ? 'Done customizing' : 'Customize dashboard'}
        onClick={() => layout.setEditMode(!layout.editMode)}
      />
    </div>
  );
}
