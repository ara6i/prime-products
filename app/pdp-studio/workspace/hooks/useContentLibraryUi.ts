"use client";

import { useState } from "react";

export function useContentLibraryUi() {
  const [dialog, setDialog] = useState<"folder" | "item" | null>(null);
  const [name, setName] = useState("");
  const [items, setItems] = useState<string[]>([]);

  function createItem(): void {
    const value = name.trim();
    if (!value) return;
    setItems((current) => [...current, value]);
    setName("");
    setDialog(null);
  }

  return {
    dialog,
    name,
    items,
    setDialog,
    setName,
    createItem,
  };
}
