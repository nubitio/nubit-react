import React, { createContext, useContext, useReducer } from 'react';
import type { ReactNode, Dispatch } from 'react';
import { dialogReducer } from './dialogStore';
import type { DialogStoreState, DialogAction } from './dialogStore';

interface DialogStoreContextValue {
  state: DialogStoreState;
  dispatch: Dispatch<DialogAction>;
}

const DialogStoreContext = createContext<DialogStoreContextValue>(null!);

export function DialogStoreProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [state, dispatch] = useReducer(dialogReducer, {});
  return (
    <DialogStoreContext.Provider value={{ state, dispatch }}>
      {children}
    </DialogStoreContext.Provider>
  );
}

export function useDialogStoreContext(): DialogStoreContextValue {
  return useContext(DialogStoreContext);
}
