import React, { createContext, useContext, useMemo } from 'react';

const SmartCrudRolesContext = createContext<string[]>([]);

export function SmartCrudRolesProvider({
  children,
  roles,
}: React.PropsWithChildren<{ roles?: string[] }>) {
  const value = useMemo(() => roles ?? [], [roles]);

  return <SmartCrudRolesContext.Provider value={value}>{children}</SmartCrudRolesContext.Provider>;
}

export function useSmartCrudRoles(): string[] {
  return useContext(SmartCrudRolesContext);
}
