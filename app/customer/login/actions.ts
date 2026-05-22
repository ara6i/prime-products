"use server";

import { redirect } from "next/navigation";
import { loginCustomer, logoutCustomer } from "@/app/customer/shared/services/customerAuthService";
import { isCustomerOnboardingCompleted } from "@/app/customer/shared/services/customerOnboardingCompletion";

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

  const result = await loginCustomer(username, password);
  if (!result.ok) {
    const message =
      result.error === "Invalid username or password."
        ? "Credentials were not correct."
        : result.error ?? "Login failed.";

    return { error: message, errorId: Date.now() };
  }

  if (result.user && await isCustomerOnboardingCompleted(result.user.username)) {
    redirect("/customer/dashboard");
  }

  redirect("/customer/onboarding");
}

export async function logoutAction(): Promise<void> {
  await logoutCustomer();
  redirect("/customer/login");
}
