"use client";

import { useState } from "react";

export function useAiToolsCatalogUi() {
  const [chooserOpen, setChooserOpen] = useState(false);

  return {
    chooserOpen,
    openChooser: () => setChooserOpen(true),
    setChooserOpen,
  };
}
