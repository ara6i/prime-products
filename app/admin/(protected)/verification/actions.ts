"use server";

import { revalidatePath } from "next/cache";
import { updateCustomerVerification } from "./services/verificationService";

function readDecisionForm(formData: FormData): { id: string; note: string } {
  const id = String(formData.get("id") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  if (!id) {
    throw new Error("Verification request id is required.");
  }
  return { id, note };
}

export async function approveVerificationAction(formData: FormData): Promise<void> {
  const { id, note } = readDecisionForm(formData);
  await updateCustomerVerification(id, "approve", note);
  revalidatePath("/admin/verification");
  revalidatePath(`/admin/verification/${id}`);
}

export async function rejectVerificationAction(formData: FormData): Promise<void> {
  const { id, note } = readDecisionForm(formData);
  if (!note) {
    throw new Error("A rejection note is required.");
  }
  await updateCustomerVerification(id, "reject", note);
  revalidatePath("/admin/verification");
  revalidatePath(`/admin/verification/${id}`);
}
