import { adminFetch } from "@/app/admin/shared/services/adminFetch";
import type { VerificationListResponse, VerificationRawRequest } from "../types";

export async function fetchCustomerVerifications(): Promise<VerificationListResponse> {
  return adminFetch<VerificationListResponse>("/api/admin/customer-verifications");
}

export async function fetchCustomerVerification(id: string): Promise<VerificationRawRequest> {
  const response = await adminFetch<{ item: VerificationRawRequest }>(
    `/api/admin/customer-verifications/${encodeURIComponent(id)}`,
  );
  return response.item;
}

export async function updateCustomerVerification(
  id: string,
  action: "approve" | "reject",
  note: string,
): Promise<void> {
  await adminFetch(`/api/admin/customer-verifications/${encodeURIComponent(id)}/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ note }),
  });
}
