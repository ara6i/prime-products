"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  PdpStudioCommandItem,
  PdpStudioOverlayId,
} from "../types";

export function usePdpStudioShellUi(commands: PdpStudioCommandItem[]) {
  const [activeOverlay, setActiveOverlay] = useState<PdpStudioOverlayId | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((current) => !current);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const filteredCommands = useMemo(() => {
    const normalizedQuery = commandQuery.trim().toLowerCase();
    if (!normalizedQuery) return commands.slice(0, 12);
    return commands
      .filter((command) =>
        [command.label, command.description, ...command.keywords]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery),
      )
      .slice(0, 18);
  }, [commandQuery, commands]);

  function openOverlay(overlay: PdpStudioOverlayId): void {
    setActiveOverlay(overlay);
    setCommandOpen(false);
    setMobileNavOpen(false);
  }

  function closeOverlay(): void {
    setActiveOverlay(null);
  }

  return {
    activeOverlay,
    commandOpen,
    commandQuery,
    filteredCommands,
    mobileNavOpen,
    setCommandOpen,
    setCommandQuery,
    setMobileNavOpen,
    openOverlay,
    closeOverlay,
  };
}
