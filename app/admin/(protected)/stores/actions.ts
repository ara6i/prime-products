"use server";

import { revalidatePath } from "next/cache";
import { adminFetch } from "@/app/admin/shared/services/adminFetch";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

async function post<T = unknown>(path: string, body?: object): Promise<T> {
  return adminFetch<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function revalidate(source: "shopify" | "sdk", id: string) {
  revalidatePath("/admin/stores");
  revalidatePath(`/admin/stores/${source}/${id}`);
  revalidatePath("/admin");
}

export async function suspendShopifyShopAction(id: string): Promise<ActionResult> {
  try {
    await post(`/api/admin/stores/shopify/${encodeURIComponent(id)}/suspend`);
    revalidate("shopify", id);
    return { ok: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to suspend";
    return { ok: false, error: msg };
  }
}

export async function activateShopifyShopAction(id: string): Promise<ActionResult> {
  try {
    await post(`/api/admin/stores/shopify/${encodeURIComponent(id)}/activate`);
    revalidate("shopify", id);
    return { ok: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to activate";
    return { ok: false, error: msg };
  }
}

export async function grantTryOnsAction(id: string, amount: number): Promise<ActionResult> {
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Amount must be a positive number" };
  }
  try {
    await post(`/api/admin/stores/shopify/${encodeURIComponent(id)}/grant-tryons`, {
      amount: Math.round(amount),
    });
    revalidate("shopify", id);
    return { ok: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to grant try-ons";
    return { ok: false, error: msg };
  }
}

export async function resetSizeGuideMappingAction(
  source: "shopify" | "sdk",
  id: string,
): Promise<ActionResult> {
  try {
    await post(
      `/api/admin/stores/${encodeURIComponent(source)}/${encodeURIComponent(id)}/reset-sizeguide-mapping`,
    );
    revalidate(source, id);
    return { ok: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to reset mapping";
    return { ok: false, error: msg };
  }
}
