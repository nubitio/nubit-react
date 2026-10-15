import { useCallback, useEffect, useRef, useState } from 'react';
import type { ComboboxOption } from './Combobox';

export interface ComboboxPage {
  options: ComboboxOption[];
  nextCursor?: string | number | null;
}

export type ComboboxLoader = (
  query: string,
  context: { signal: AbortSignal; cursor?: string | number },
) => Promise<ComboboxPage>;

function mergeOptions(...groups: ComboboxOption[][]): ComboboxOption[] {
  const map = new Map<string, ComboboxOption>();
  for (const group of groups) for (const option of group) map.set(option.value, option);
  return [...map.values()];
}

interface RemoteState {
  loader?: ComboboxLoader;
  query: string;
  options: ComboboxOption[];
  known: ComboboxOption[];
  nextCursor?: string | number | null;
  loading: boolean;
  failed: boolean;
}

export function useComboboxOptions({
  options,
  selected,
  loadOptions,
  open,
  query,
  debounceMs,
  minSearchLength,
}: {
  options: ComboboxOption[];
  selected: string[];
  loadOptions?: ComboboxLoader;
  open: boolean;
  query: string;
  debounceMs: number;
  minSearchLength: number;
}) {
  const [state, setState] = useState<RemoteState>({
    query: '',
    options: [],
    known: [],
    loading: false,
    failed: false,
  });
  const [revision, setRevision] = useState(0);
  const generation = useRef(0);
  const request = useRef<AbortController | null>(null);
  const normalizedQuery = query.trim();
  const eligible = normalizedQuery.length >= minSearchLength;

  useEffect(() => {
    const currentGeneration = ++generation.current;
    request.current?.abort();
    request.current = null;
    if (!loadOptions || !open || !eligible) return;
    const controller = new AbortController();
    request.current = controller;
    const timer = setTimeout(
      async () => {
        setState((previous) => ({
          loader: loadOptions,
          query: normalizedQuery,
          options: [],
          known: previous.loader === loadOptions ? previous.known : [],
          loading: true,
          failed: false,
        }));
        try {
          const page = await loadOptions(normalizedQuery, { signal: controller.signal });
          if (controller.signal.aborted || generation.current !== currentGeneration) return;
          setState((previous) => ({
            loader: loadOptions,
            query: normalizedQuery,
            options: mergeOptions(page.options),
            known: mergeOptions(previous.known, page.options),
            nextCursor: page.nextCursor,
            loading: false,
            failed: false,
          }));
        } catch {
          if (controller.signal.aborted || generation.current !== currentGeneration) return;
          setState((previous) => ({ ...previous, loading: false, failed: true }));
        } finally {
          if (request.current === controller) request.current = null;
        }
      },
      Math.max(0, debounceMs),
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [loadOptions, open, normalizedQuery, eligible, debounceMs, revision]);

  const current = state.loader === loadOptions && state.query === normalizedQuery;
  const loading = !!loadOptions && open && eligible && (!current || state.loading);
  const failed = !!loadOptions && open && current && state.failed;
  const known = mergeOptions(options, state.loader === loadOptions ? state.known : []);
  const pinned = known.filter((option) => selected.includes(option.value));
  const items = loadOptions
    ? mergeOptions(pinned, current && eligible ? state.options : [])
    : options;

  const loadMore = useCallback(async () => {
    if (
      !loadOptions ||
      !open ||
      !current ||
      state.loading ||
      request.current ||
      state.nextCursor == null ||
      !eligible
    )
      return;
    const controller = new AbortController();
    const currentGeneration = generation.current;
    request.current = controller;
    setState((previous) => ({ ...previous, loading: true, failed: false }));
    try {
      const page = await loadOptions(normalizedQuery, {
        signal: controller.signal,
        cursor: state.nextCursor,
      });
      if (controller.signal.aborted || currentGeneration !== generation.current) return;
      setState((previous) => ({
        ...previous,
        options: mergeOptions(previous.options, page.options),
        known: mergeOptions(previous.known, page.options),
        nextCursor: page.nextCursor,
        loading: false,
        failed: false,
      }));
    } catch {
      if (controller.signal.aborted || currentGeneration !== generation.current) return;
      setState((previous) => ({ ...previous, loading: false, failed: true }));
    } finally {
      if (request.current === controller) request.current = null;
    }
  }, [loadOptions, open, current, state.loading, state.nextCursor, eligible, normalizedQuery]);

  // Also cancels pagination requests, which have a different controller from
  // the initial search, when the query/session changes or the control unmounts.
  useEffect(
    () => () => {
      request.current?.abort();
    },
    [open, normalizedQuery, loadOptions],
  );

  return {
    items,
    known,
    loading,
    failed,
    eligible,
    hasMore: !!loadOptions && open && eligible && current && state.nextCursor != null,
    loadMore,
    retry: () => setRevision((previous) => previous + 1),
  };
}
