import { useReducer, useCallback, useEffect } from 'react';
import { useEvents, type EventSubscription as Subscription, type FormEventNames } from '@nubit/core';
import type { SmartCrudOperation } from './fieldOperationSemantics';
import type { FormDataRecord } from '../form/FormDataSnapshot';

function areEqualValues(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }

  if (left instanceof Date && right instanceof Date) {
    return left.getTime() === right.getTime();
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) {
      return false;
    }

    return left.every((item, index) => areEqualValues(item, right[index]));
  }

  return false;
}

function areEqualFormData(
  left: FormDataRecord | null,
  right: FormDataRecord | null,
): boolean {
  if (left === right) {
    return true;
  }

  if (left == null || right == null) {
    return false;
  }

  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every(
    (key) => Object.prototype.hasOwnProperty.call(right, key) && areEqualValues(left[key], right[key]),
  );
}

interface RoutingSnapshot {
  initialRecordId: string | null;
  initialIsNew: boolean;
}

export interface SmartCrudOperationState {
  activeOperation: SmartCrudOperation | null;
  formData: FormDataRecord | null;
  handleFormDataChange: (data: FormDataRecord) => void;
  startCreate: () => void;
  startEdit: () => void;
  resetOperation: () => void;
}

type CrudState = Pick<SmartCrudOperationState, 'activeOperation' | 'formData'>;

type CrudAction =
  | { type: 'sync-routing'; routingState: RoutingSnapshot }
  | { type: 'set-form-data'; data: FormDataRecord }
  | { type: 'create' }
  | { type: 'edit' }
  | { type: 'reset' };

function stateFromRouting(routingState: RoutingSnapshot): CrudState {
  if (routingState.initialRecordId != null) {
    return { activeOperation: 'edit', formData: null };
  }

  if (routingState.initialIsNew) {
    return { activeOperation: 'create', formData: {} };
  }

  return { activeOperation: null, formData: null };
}

function crudReducer(state: CrudState, action: CrudAction): CrudState {
  switch (action.type) {
    case 'sync-routing':
      {
        const nextState = stateFromRouting(action.routingState);
        return state.activeOperation === nextState.activeOperation &&
          areEqualFormData(state.formData, nextState.formData)
          ? state
          : nextState;
      }
    case 'set-form-data':
      return areEqualFormData(state.formData, action.data) ? state : { ...state, formData: action.data };
    case 'create':
      return state.activeOperation === 'create' && areEqualFormData(state.formData, {})
        ? state
        : { activeOperation: 'create', formData: {} };
    case 'edit':
      return state.activeOperation === 'edit' && state.formData === null
        ? state
        : { activeOperation: 'edit', formData: null };
    case 'reset':
      return state.activeOperation === null && state.formData === null
        ? state
        : { activeOperation: null, formData: null };
    default:
      return state;
  }
}

/**
 * Owns the `activeOperation` + `formData` state pair and keeps them in sync
 * with routing changes and the resource event bus (ADD / EDIT / CANCEL / SUCCESS).
 *
 * Extracted from SmartCrudPage to consolidate three separate useEffects that
 * previously managed these coupled states independently.
 */
export function useSmartCrudOperation(
  events: FormEventNames | undefined,
  routingState: RoutingSnapshot,
): SmartCrudOperationState {
  const [on] = useEvents();

  const [{ activeOperation, formData }, dispatchState] = useReducer(
    crudReducer,
    routingState,
    stateFromRouting,
  );

  // Stable callback — avoids re-rendering CrudPage on every setState call
  const handleFormDataChange = useCallback((data: FormDataRecord) => {
    dispatchState({ type: 'set-form-data', data });
  }, []);

  const startCreate = useCallback(() => {
    dispatchState({ type: 'create' });
  }, []);

  const startEdit = useCallback(() => {
    dispatchState({ type: 'edit' });
  }, []);

  const resetOperation = useCallback(() => {
    dispatchState({ type: 'reset' });
  }, []);

  // Sync from routing state changes
  useEffect(() => {
    dispatchState({
      type: 'sync-routing',
      routingState: {
        initialRecordId: routingState.initialRecordId,
        initialIsNew: routingState.initialIsNew,
      },
    });
  }, [routingState.initialIsNew, routingState.initialRecordId]);

  // Sync from event bus (ADD / EDIT / CANCEL / SUCCESS)
  useEffect(() => {
    const subscriptions: Subscription[] = [];

    if (events?.ADD) {
      subscriptions.push(
        on(events.ADD, () => {
          dispatchState({ type: 'create' });
        }),
      );
    }

    if (events?.EDIT) {
      subscriptions.push(
        on(events.EDIT, () => {
          dispatchState({ type: 'edit' });
        }),
      );
    }

    if (events?.CANCEL) {
      subscriptions.push(
        on(events.CANCEL, () => {
          dispatchState({ type: 'reset' });
        }),
      );
    }

    if (events?.SUCCESS) {
      subscriptions.push(
        on(events.SUCCESS, () => {
          dispatchState({ type: 'reset' });
        }),
      );
    }

    return () => {
      subscriptions.forEach((sub) => sub.unsubscribe());
    };
  }, [events?.ADD, events?.CANCEL, events?.EDIT, events?.SUCCESS, on]);

  return { activeOperation, formData, handleFormDataChange, startCreate, startEdit, resetOperation };
}
