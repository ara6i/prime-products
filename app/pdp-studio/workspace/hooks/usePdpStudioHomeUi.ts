"use client";

import { useState } from "react";

export function usePdpStudioHomeUi() {
  const [showWorkflowCards, setShowWorkflowCards] = useState(true);

  return {
    showWorkflowCards,
    setShowWorkflowCards,
  };
}
