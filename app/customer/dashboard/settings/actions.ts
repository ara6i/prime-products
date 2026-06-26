"use server";

import { revalidatePath } from "next/cache";
import { customerFetch } from "@/app/customer/shared/services/customerFetch";
import type { CustomerIpLimitSettings } from "../types/settings";

export interface UpdateCustomerIpLimitActionResult {
  ok: boolean;
  error?: string;
  ipLimit?: CustomerIpLimitSettings;
}

export async function updateCustomerIpLimitAction(input: {
  productEnabled: boolean;
  productMaxAttemptsPerIpProduct: number;
  storeEnabled: boolean;
  storeMaxAttemptsPerIpMonth: number;
}): Promise<UpdateCustomerIpLimitActionResult> {
  try {
    const data = await customerFetch<{
      ok: boolean;
      ipLimit: CustomerIpLimitSettings;
      error?: string;
    }>("/api/customer/dashboard/settings/ip-limit", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productEnabled: input.productEnabled,
        productMaxAttemptsPerIpProduct: input.productMaxAttemptsPerIpProduct,
        storeEnabled: input.storeEnabled,
        storeMaxAttemptsPerIpMonth: input.storeMaxAttemptsPerIpMonth,
      }),
    });
    revalidatePath("/customer/dashboard/settings");
    return { ok: true, ipLimit: data.ipLimit };
  } catch (error) {
    if (typeof error === "object" && error && "message" in error) {
      return { ok: false, error: String((error as { message: unknown }).message) };
    }
    return { ok: false, error: "Could not save IP-limit settings." };
  }
}
