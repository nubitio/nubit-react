import { useLayoutEffect, useMemo, useId, useRef, useState, type ReactNode } from 'react';
import type { FieldButtonFeedback } from '../Field';
import type { FieldControlProps } from './FieldTypeModule';

const ICONS: Record<string, string> = {
  search: 'ph-magnifying-glass',
  add: 'ph-plus',
  clear: 'ph-x',
};
function buttonIcon(icon = 'search') {
  if (icon.startsWith('ph ')) return icon;
  return `ph ${ICONS[icon] ?? (icon.startsWith('ph-') ? icon : ICONS.search)}`;
}

/** Async field actions retain feedback only for the field value and form that started them. */
export function FieldInputActions({
  field,
  value,
  ctx,
  setFieldValue,
  disabled,
  readOnly,
  children,
}: FieldControlProps & { children: ReactNode }) {
  const feedbackId = useId();
  const scope = useMemo(() => ({ value, form: ctx.actionScopeKey }), [value, ctx.actionScopeKey]);
  const latest = useRef<object | null>(scope);
  const active = useRef<{ scope: object } | null>(null);
  useLayoutEffect(() => {
    latest.current = scope;
    return () => {
      latest.current = null;
      active.current = null;
    };
  }, [scope]);
  const [state, setState] = useState<{
    scope: object;
    pending: boolean;
    index: number;
    feedback?: FieldButtonFeedback;
  } | null>(null);
  const current = state?.scope === scope ? state : null;
  const labeled = field.buttons.some((button) => button.options?.text);

  async function run(index: number, event: unknown) {
    if (current?.pending || active.current?.scope === scope) return;
    const action = field.buttons[index]?.options?.onClick;
    if (!action) return;
    const request = { scope };
    const initialValue = value;
    active.current = request;
    const isCurrent = () =>
      active.current === request &&
      latest.current === scope &&
      Object.is(ctx.getFieldValue(field.name), initialValue);
    setState({ scope, pending: true, index });
    try {
      const feedback = await action(event, {
        getFieldValue: ctx.getFieldValue,
        setFieldValue,
        isCurrent,
      });
      if (isCurrent()) setState({ scope, pending: false, index, feedback: feedback || undefined });
    } catch {
      if (isCurrent())
        setState({
          scope,
          pending: false,
          index,
          feedback: { tone: 'danger', message: ctx.t('form.actionError') },
        });
    } finally {
      if (active.current === request) active.current = null;
    }
  }

  return (
    <>
      <div className={`nb-form__input-group${labeled ? ' nb-form__input-group--labeled' : ''}`}>
        {children}
        <div className="nb-form__input-actions">
          {field.buttons.map((button, index) => {
            const options = button.options ?? {};
            const label =
              options.ariaLabel ??
              options.text ??
              (button.name === 'search'
                ? ctx.t('form.searchButton')
                : String(button.name ?? ctx.t('form.actionButton')));
            const loading = current?.pending && current.index === index;
            return (
              <button
                key={String(button.name ?? index)}
                type="button"
                className="nb-form__input-button"
                disabled={disabled || readOnly || current?.pending}
                aria-busy={loading || undefined}
                aria-describedby={current?.feedback ? feedbackId : undefined}
                aria-label={label}
                title={label}
                onClick={(event) => void run(index, event)}
              >
                {loading ? (
                  <span className="nb-button-spinner" aria-hidden="true" />
                ) : (
                  <i className={buttonIcon(options.icon)} aria-hidden="true" />
                )}
                {options.text && (
                  <span>
                    {loading ? (options.loadingText ?? ctx.t('grid.loading')) : options.text}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      {current?.feedback && (
        <p
          id={feedbackId}
          className={`nb-form__action-feedback nb-form__action-feedback--${current.feedback.tone}`}
          role={current.feedback.tone === 'danger' ? 'alert' : 'status'}
        >
          {current.feedback.message}
        </p>
      )}
    </>
  );
}
