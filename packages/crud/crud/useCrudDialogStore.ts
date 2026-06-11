import { useCallback } from 'react';
import { useDialogStoreContext } from './DialogStoreProvider';
import { initialDialogState } from './dialogStore';
import type { DialogMode, DialogSlice } from './dialogStore';
import type { DataRecord } from '@nubitio/core';

export function useCrudDialogStore(resourceId: string): DialogSlice {
  const { state, dispatch } = useDialogStoreContext();
  const dialogState = state[resourceId] ?? initialDialogState();

  const openDialog = useCallback(
    (mode: DialogMode, rowData: DataRecord | null = null) => {
      dispatch({ type: 'OPEN', resourceId, mode, rowData });
    },
    [dispatch, resourceId],
  );

  const closeDialog = useCallback(() => {
    dispatch({ type: 'CLOSE', resourceId });
  }, [dispatch, resourceId]);

  return { ...dialogState, openDialog, closeDialog };
}
