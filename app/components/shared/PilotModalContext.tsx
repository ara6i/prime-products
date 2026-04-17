"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { PilotModal } from "./PilotModal";

type Ctx = { open: () => void };

const PilotModalContext = createContext<Ctx | null>(null);

export function PilotModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const value = useMemo<Ctx>(() => ({ open }), [open]);

  return (
    <PilotModalContext.Provider value={value}>
      {children}
      <PilotModal open={isOpen} onOpenChange={setIsOpen} />
    </PilotModalContext.Provider>
  );
}

export function usePilotModal(): Ctx {
  const ctx = useContext(PilotModalContext);
  if (!ctx) {
    return { open: () => {} };
  }
  return ctx;
}
