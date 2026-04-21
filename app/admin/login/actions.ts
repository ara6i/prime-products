"use server";

import { redirect } from "next/navigation";
import { loginAdmin, logoutAdmin } from "@/app/admin/shared/services/adminAuthService";

export interface LoginState {
  error: string | null;
}

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const username = (formData.get("username") as string | null) ?? "";
  const password = (formData.get("password") as string | null) ?? "";

  if (!username || !password) {
    return { error: "Enter both username and password." };
  }

  const result = await loginAdmin(username, password);
  if (!result.ok) {
    return { error: result.error ?? "Login failed." };
  }

  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  await logoutAdmin();
  redirect("/admin/login");
}
