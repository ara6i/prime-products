"use client";

import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";

interface HeaderOverride {
  leftContent?: ReactNode;
}

interface DashboardHeaderContextValue {
  override: HeaderOverride;
  setOverride: (override: HeaderOverride) => void;
  clearOverride: () => void;
}

const DashboardHeaderContext = createContext<DashboardHeaderContextValue>({
  override: {},
  setOverride: () => {},
  clearOverride: () => {},
});

export function DashboardHeaderProvider({ children }: { children: ReactNode }) {
  const [override, setOverrideState] = useState<HeaderOverride>({});

  const setOverride = useCallback((o: HeaderOverride) => setOverrideState(o), []);
  const clearOverride = useCallback(() => setOverrideState({}), []);

  return (
    <DashboardHeaderContext.Provider value={{ override, setOverride, clearOverride }}>
      {children}
    </DashboardHeaderContext.Provider>
  );
}

export function useDashboardHeaderOverride() {
  return useContext(DashboardHeaderContext);
}
