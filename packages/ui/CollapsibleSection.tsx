import React, { useId } from 'react';
import './CollapsibleSection.scss';

// ---------------------------------------------------------------------------
// CollapsibleSection — accessible disclosure pattern.
//
// A full-width button header with a chevron icon that toggles a collapsible
// body. The body is always mounted (no conditional render) so form values and
// focus state inside the body are preserved when collapsed.
//
// Usage:
//   <CollapsibleSection
//     label="Nota interna"
//     icon="ph ph-chat-circle"
//     open={noteOpen}
//     onToggle={() => setNoteOpen(v => !v)}
//   >
//     <TextAreaField ... />
//   </CollapsibleSection>
// ---------------------------------------------------------------------------

export interface CollapsibleSectionProps {
  /** Section heading text. */
  label: React.ReactNode;
  /** Optional Phosphor icon class string, e.g. "ph ph-chat-circle". */
  icon?: string;
  /** Controlled open state. */
  open: boolean;
  /** Called when the header trigger is clicked. */
  onToggle: () => void;
  /** Body content — always mounted, hidden via CSS when collapsed. */
  children: React.ReactNode;
  /**
   * Optional trailing slot rendered to the right of the label.
   * Useful for a clear button or indicator badge.
   */
  trailing?: React.ReactNode;
  className?: string;
  /** Additional class applied to the body container. */
  bodyClassName?: string;
  /** Forwarded to the root element for testing. */
  'data-testid'?: string;
}

/**
 * Accessible collapsible section with a labelled header trigger.
 *
 * - Uses `aria-expanded` and `aria-controls` for screen reader support.
 * - The body is conditionally rendered (not just hidden) to avoid mounting
 *   heavy children before they are needed. Pass `keepMounted` if you need
 *   the body always in the DOM.
 */
export const CollapsibleSection = ({
  label,
  icon,
  open,
  onToggle,
  children,
  trailing,
  className,
  bodyClassName,
  'data-testid': testId,
}: CollapsibleSectionProps) => {
  const bodyId = useId();

  return (
    <div
      className={['nb-collapsible', open && 'nb-collapsible--open', className].filter(Boolean).join(' ')}
      data-testid={testId}
    >
      <div className="nb-collapsible__header">
        <button
          type="button"
          className="nb-collapsible__trigger"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={onToggle}
        >
          {icon && <i className={icon} aria-hidden="true" />}
          <span className="nb-collapsible__label">{label}</span>
          <i className="ph ph-caret-down nb-collapsible__chevron" aria-hidden="true" />
        </button>
        {trailing && (
          <div className="nb-collapsible__trailing">{trailing}</div>
        )}
      </div>

      <div
        id={bodyId}
        className={['nb-collapsible__body', bodyClassName].filter(Boolean).join(' ')}
        role="region"
        aria-labelledby={undefined}
        hidden={!open}
      >
        {children}
      </div>
    </div>
  );
};
