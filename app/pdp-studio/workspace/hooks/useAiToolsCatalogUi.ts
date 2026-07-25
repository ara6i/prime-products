"use client";

import { useMemo, useState } from "react";
import type { PdpStudioToolDefinition } from "../types";

export function useAiToolsCatalogUi(tools: PdpStudioToolDefinition[]) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<"all" | "create" | "editing">("all");

  const filteredTools = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return tools.filter((tool) => {
      const matchesQuery =
        !normalized ||
        `${tool.label} ${tool.description}`.toLowerCase().includes(normalized);
      const matchesGroup =
        group === "all" ||
        (group === "create" && tool.group === "create") ||
        (group === "editing" && tool.group === "all");
      return matchesQuery && matchesGroup;
    });
  }, [group, query, tools]);

  return {
    query,
    group,
    filteredTools,
    setQuery,
    setGroup,
  };
}
