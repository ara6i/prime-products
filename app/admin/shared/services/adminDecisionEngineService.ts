"use server";

import { adminFetch } from "./adminFetch";
import type { DecisionEngineOverview } from "../types";

export async function getDecisionEngine(
  range: "7d" | "30d" | "90d" = "30d",
): Promise<DecisionEngineOverview | null> {
  try {
    return await adminFetch<DecisionEngineOverview>(
      `/api/admin/analytics/decision-engine?range=${range}`,
    );
  } catch (error) {
    console.error("Failed to load decision-engine analytics", error);
    return null;
  }
}
