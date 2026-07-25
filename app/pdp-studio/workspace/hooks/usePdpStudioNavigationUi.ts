"use client";

import { useState } from "react";

export function usePdpStudioNavigationUi() {
  const [expandedGroup, setExpandedGroup] = useState<string | null>("Content");

  function toggleGroup(label: string): void {
    setExpandedGroup((current) => (current === label ? null : label));
  }

  return {
    expandedGroup,
    toggleGroup,
  };
}
