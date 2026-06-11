import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type Density = 'normal' | 'compact';

export interface DensityContextValue {
  density: Density;
  toggleDensity: () => void;
}

export const DensityContext = createContext<DensityContextValue | null>(null);

export function useDensity(): DensityContextValue {
  const ctx = useContext(DensityContext);
  if (!ctx) throw new Error('useDensity must be used inside DensityProvider');
  return ctx;
}

const STORAGE_KEY = 'app-density';

export const DensityProvider = ({ children }: { children: React.ReactNode }) => {
  const [density, setDensity] = useState<Density>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Density | null;
    return stored === 'compact' ? 'compact' : 'normal';
  });

  useEffect(() => {
    if (density === 'compact') {
      document.documentElement.dataset.density = 'compact';
    } else {
      delete document.documentElement.dataset.density;
    }
    localStorage.setItem(STORAGE_KEY, density);
  }, [density]);

  const toggleDensity = useCallback(() => {
    setDensity((prev) => (prev === 'normal' ? 'compact' : 'normal'));
  }, []);

  return (
    <DensityContext.Provider value={{ density, toggleDensity }}>
      {children}
    </DensityContext.Provider>
  );
};
