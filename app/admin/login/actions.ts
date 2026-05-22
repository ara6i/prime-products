"use server";

import { redirect } from "next/navigation";
import { loginAdmin, logoutAdmin } from "@/app/admin/shared/services/adminAuthService";

export interface LoginState {
  error: string | null;
  errorId?: number;
}

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const username = (formData.get("username") as string | null) ?? "";
  const password = (formData.get("password") as string | null) ?? "";

  if (!username || !password) {
    return { error: "Enter both username and password.", errorId: Date.now() };
  }

  const result = await loginAdmin(username, password);
  if (!result.ok) {
    const message =
      result.error === "Invalid username or password."
        ? "Credentials were not correct."
        : result.error ?? "Login failed.";

    return { error: message, errorId: Date.now() };
  }

  if (result.user?.role === "merchant") {
    await logoutAdmin();
    return {
      error: "This is a customer account. Use the customer login page.",
      errorId: Date.now(),
    };
  }

  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  await logoutAdmin();
  redirect("/admin/login");
}
