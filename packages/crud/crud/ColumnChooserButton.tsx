import { IconButton, Popover, Toggle } from '@nubitio/ui';
import './ColumnChooserButton.scss';
import type { ColumnChooserState } from './useColumnChooser';

export interface ColumnChooserButtonProps {
  state: ColumnChooserState;
  triggerLabel: string;
  selectAllLabel: string;
  resetLabel: string;
}

export function ColumnChooserButton({
  state,
  triggerLabel,
  selectAllLabel,
  resetLabel,
}: ColumnChooserButtonProps) {
  return (
    <Popover
      align="start"
      ariaLabel={triggerLabel}
      trigger={({ open, toggle }) => (
        <IconButton
          icon="ph ph-columns"
          label={triggerLabel}
          aria-expanded={open}
          className={
            state.isCustomized ? 'nb-column-chooser__trigger nb-column-chooser__trigger--active' : undefined
          }
          onClick={toggle}
        />
      )}
      panel={() => (
        <div className="nb-column-chooser__panel">
          <div className="nb-column-chooser__actions">
            <button type="button" className="nb-column-chooser__action" onClick={state.selectAll}>
              {selectAllLabel}
            </button>
            <button type="button" className="nb-column-chooser__action" onClick={state.reset}>
              {resetLabel}
            </button>
          </div>
          <ul className="nb-column-chooser__list">
            {state.fields.map((field) => (
              <li key={field.name} className="nb-column-chooser__item">
                <Toggle
                  size="sm"
                  checked={state.isVisible(field.name)}
                  onChange={() => state.toggle(field.name)}
                  label={field.label || field.name}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    />
  );
}
