"use client";

import { useMemo } from "react";
import type { BlogPageViewModel } from "../types";

export function useBlogPage(initialViewModel: BlogPageViewModel) {
  return useMemo(() => initialViewModel, [initialViewModel]);
}
