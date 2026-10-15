import { createContext, useContext } from 'react';

/** Keeps nested portals within the modal's focus and accessibility boundary. */
export const OverlayContainerContext = createContext<HTMLElement | null>(null);
export const useOverlayContainer = () => useContext(OverlayContainerContext);
