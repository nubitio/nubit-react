import { useRef, type Dispatch, type MouseEvent as ReactMouseEvent, type RefObject, type SetStateAction } from 'react';
import { MIN_COL_WIDTH } from './gridLayoutUtils';

interface ColumnResizeOptions {
  setColWidths: Dispatch<SetStateAction<Record<string, number>>>;
  syncHorizontalScrollRef: RefObject<() => void>;
}

/** Drag-to-resize for a column header: tracks the active drag and writes live widths. */
export function useColumnResize({ setColWidths, syncHorizontalScrollRef }: ColumnResizeOptions) {
  const resizingRef = useRef<{ name: string; startX: number; startWidth: number } | null>(null);

  const handleResizeMouseDown = (fieldName: string) => (event: ReactMouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const th = (event.currentTarget as HTMLElement).closest('th') as HTMLTableCellElement | null;
    if (!th) return;

    resizingRef.current = {
      name: fieldName,
      startX: event.clientX,
      startWidth: th.offsetWidth,
    };

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingRef.current) return;
      const resize = resizingRef.current;
      const next = Math.max(MIN_COL_WIDTH, resize.startWidth + (moveEvent.clientX - resize.startX));
      setColWidths((current) => ({ ...current, [resize.name]: next }));
      requestAnimationFrame(() => syncHorizontalScrollRef.current());
    };
    const onMouseUp = () => {
      resizingRef.current = null;
      syncHorizontalScrollRef.current();
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return handleResizeMouseDown;
}
