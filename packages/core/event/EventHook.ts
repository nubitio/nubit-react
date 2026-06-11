import { useEffect, useRef } from 'react';

type Handler<T = unknown> = (payload: T) => void;
type Unsubscribe = () => void;

/** Minimal subscription token — compatible with RxJS Subscription.unsubscribe() call-sites */
export interface EventSubscription {
  unsubscribe: Unsubscribe;
  /** Convenience alias used by some call-sites via .add() — no-op, kept for compat */
  add: (teardown: Unsubscribe) => EventSubscription;
}

const listeners = new Map<string, Set<Handler>>();

function subscribe<T>(name: string, handler: Handler<T>): EventSubscription {
  if (!listeners.has(name)) {
    listeners.set(name, new Set());
  }
  const set = listeners.get(name)!;
  set.add(handler as Handler);

  const subscription: EventSubscription = {
    unsubscribe: () => {
      set.delete(handler as Handler);
    },
    add: (teardown) => {
      const outer = subscription.unsubscribe;
      subscription.unsubscribe = () => {
        outer();
        teardown();
      };
      return subscription;
    },
  };

  return subscription;
}

export const useEvents = () => {
  const subsRef = useRef<EventSubscription[]>([]);

  useEffect(() => {
    return () => {
      subsRef.current.forEach((sub) => sub.unsubscribe());
      subsRef.current = [];
    };
  }, []);

  const on = <T>(name: string, handler: (payload: T) => void): EventSubscription => {
    const sub = subscribe(name, handler);
    subsRef.current.push(sub);
    return sub;
  };

  const emit = <T>(name: string, payload?: T) => {
    dispatch(name, payload);
  };

  return [on, emit] as const;
};

export const dispatch = <T>(name: string, payload?: T) => {
  listeners.get(name)?.forEach((handler) => {
    try {
      handler(payload);
    } catch {
      // Prevent one bad handler from breaking others
    }
  });
};
