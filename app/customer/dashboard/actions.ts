"use server";

import { revalidatePath } from "next/cache";
import { customerFetch } from "@/app/customer/shared/services/customerFetch";

export interface CustomerApiKeyActionResult {
  ok: boolean;
  error?: string;
  created?: boolean;
  key?: string | null;
  name?: string;
  keyPrefix?: string;
  allowedDomains?: string[];
  message?: string;
}

export async function createCustomerApiKeyAction(input: { name?: string } = {}): Promise<CustomerApiKeyActionResult> {
  try {
    const data = await customerFetch<{
      created: boolean;
      key: string | null;
      name: string;
      keyPrefix: string;
      allowedDomains: string[];
      message: string;
    }>("/api/customer/onboarding/api-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: input.name }),
    });
    revalidatePath("/customer/dashboard");
    revalidatePath("/customer/dashboard/docs");
    revalidatePath("/customer/dashboard/settings");
    return { ok: true, ...data };
  } catch (error) {
    if (typeof error === "object" && error && "message" in error) {
      return { ok: false, error: String((error as { message: unknown }).message) };
    }
    return { ok: false, error: "Could not create the production API key." };
  }
}
