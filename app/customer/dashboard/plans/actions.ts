"use server";

import { redirect } from "next/navigation";
import { customerFetch } from "@/app/customer/shared/services/customerFetch";

interface CustomerPlanCheckoutResponse {
  checkoutUrl: string;
}

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function buildPlansUrl(formData: FormData, checkoutError?: string): string {
  const params = new URLSearchParams();
  const tryOns = readString(formData, "requestedTryOns");
  const productTier = readString(formData, "productAccessLimit");
  const autoRefillEnabled = readString(formData, "autoRefillEnabled");

  if (productTier) params.set("productTier", productTier);
  if (tryOns) params.set("tryOns", tryOns);
  if (autoRefillEnabled === "true") params.set("refill", "1");
  if (checkoutError) params.set("checkoutError", checkoutError);

  const query = params.toString();
  return query ? `/customer/dashboard/plans?${query}` : "/customer/dashboard/plans";
}

function parseErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") return "Could not create Lemon checkout.";
  const message = (error as { message?: unknown }).message;
  if (typeof message !== "string") return "Could not create Lemon checkout.";

  try {
    const parsed = JSON.parse(message) as { error?: unknown; message?: unknown };
    if (typeof parsed.error === "string") return parsed.error;
    if (typeof parsed.message === "string") return parsed.message;
  } catch {
    return message;
  }

  return message;
}

export async function createCustomerPlanCheckoutAction(formData: FormData): Promise<void> {
  let checkoutUrl = "";

  try {
    const response = await customerFetch<CustomerPlanCheckoutResponse>("/api/customer/billing/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        productCount: readString(formData, "productCount"),
        productAccessLimit: readString(formData, "productAccessLimit"),
        requestedTryOns: readString(formData, "requestedTryOns"),
        autoRefillEnabled: readString(formData, "autoRefillEnabled") === "true",
      }),
    });
    checkoutUrl = response.checkoutUrl;
  } catch (error) {
    redirect(buildPlansUrl(formData, parseErrorMessage(error)));
  }

  redirect(checkoutUrl || buildPlansUrl(formData, "Lemon checkout did not return a URL."));
}

export async function createCustomerTryOnPackCheckoutAction(formData: FormData): Promise<void> {
  let checkoutUrl = "";

  try {
    const response = await customerFetch<CustomerPlanCheckoutResponse>("/api/customer/billing/tryon-pack/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        quantity: readString(formData, "quantity"),
      }),
    });
    checkoutUrl = response.checkoutUrl;
  } catch (error) {
    redirect(buildPlansUrl(formData, parseErrorMessage(error)));
  }

  redirect(checkoutUrl || buildPlansUrl(formData, "Lemon checkout did not return a URL."));
}
