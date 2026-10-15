import { useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import './Tabs.scss';

export interface TabsItem<T extends string = string> {
  value: T;
  label: ReactNode;
  content: ReactNode;
  disabled?: boolean;
}

export interface TabsProps<T extends string = string> {
  items: TabsItem<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name of the tab list. */
  'aria-label': string;
  orientation?: 'horizontal' | 'vertical';
  activationMode?: 'automatic' | 'manual';
  /** Keep inactive panels mounted to preserve local form state. */
  keepMounted?: boolean;
  className?: string;
}

export function Tabs<T extends string = string>({
  items,
  value,
  onChange,
  'aria-label': ariaLabel,
  orientation = 'horizontal',
  activationMode = 'automatic',
  keepMounted = false,
  className,
}: TabsProps<T>) {
  const id = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const [focusedValue, setFocusedValue] = useState<T | null>(null);
  const selectedIndex = items.findIndex((item) => item.value === value && !item.disabled);
  const focusedIndex = items.findIndex((item) => item.value === focusedValue && !item.disabled);
  const tabStop =
    activationMode === 'manual' && focusedIndex >= 0
      ? focusedIndex
      : selectedIndex >= 0
        ? selectedIndex
        : items.findIndex((item) => !item.disabled);
  return (
    <div className={`nb-tabs nb-tabs--${orientation}${className ? ` ${className}` : ''}`}>
      <div
        ref={listRef}
        role="tablist"
        aria-label={ariaLabel}
        aria-orientation={orientation}
        className="nb-tabs__list"
      >
        {items.map((item, index) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            id={`${id}-tab-${index}`}
            aria-controls={`${id}-panel-${index}`}
            aria-selected={index === selectedIndex}
            disabled={item.disabled}
            tabIndex={index === tabStop ? 0 : -1}
            className="nb-tabs__tab"
            onFocus={() => setFocusedValue(item.value)}
            onClick={() => onChange(item.value)}
            onKeyDown={(event) => {
              const nextKey = orientation === 'horizontal' ? 'ArrowRight' : 'ArrowDown';
              const previousKey = orientation === 'horizontal' ? 'ArrowLeft' : 'ArrowUp';
              if (![nextKey, previousKey, 'Home', 'End'].includes(event.key)) return;
              event.preventDefault();
              const enabled = items
                .map((entry, i) => (entry.disabled ? -1 : i))
                .filter((i) => i >= 0);
              const position = enabled.indexOf(index);
              const next =
                event.key === 'Home'
                  ? enabled[0]
                  : event.key === 'End'
                    ? enabled[enabled.length - 1]
                    : enabled[
                        (position + (event.key === nextKey ? 1 : -1) + enabled.length) %
                          enabled.length
                      ];
              if (next === undefined) return;
              listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
              if (activationMode === 'automatic') onChange(items[next].value);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      {items.map((item, index) => (
        <div
          key={item.value}
          role="tabpanel"
          id={`${id}-panel-${index}`}
          aria-labelledby={`${id}-tab-${index}`}
          hidden={index !== selectedIndex}
          tabIndex={0}
          className="nb-tabs__panel"
        >
          {keepMounted || index === selectedIndex ? item.content : null}
        </div>
      ))}
    </div>
  );
}
