"use server";

import { redirect } from "next/navigation";
import {
  loginCustomer,
  logoutCustomer,
  signupCustomer,
  socialLoginCustomer,
  verifyCustomerEmail,
} from "@/app/customer/shared/services/customerAuthService";
import { isCustomerOnboardingCompleted } from "@/app/customer/shared/services/customerOnboardingCompletion";

export interface LoginState {
  error: string | null;
  errorId?: number;
}

export interface SignupState {
  error: string | null;
  errorId?: number;
  verificationEmail?: string | null;
  message?: string | null;
}

export interface VerifySignupState {
  error: string | null;
  errorId?: number;
}

export interface SocialLoginState {
  ok: boolean;
  error?: string;
  redirectTo?: string;
}

export async function loginAction(
	_prevState: LoginState,
	formData: FormData,
): Promise<LoginState> {
	const username = ((formData.get("username") as string | null) ?? "").trim();
	const password = (formData.get("password") as string | null) ?? "";

	if (!username || !password) {
		return { error: "Enter both email and password.", errorId: Date.now() };
	}
	if (!isValidLoginIdentifier(username)) {
		return { error: "Enter a valid email address.", errorId: Date.now() };
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

function isValidLoginIdentifier(value: string): boolean {
	if (value.toLowerCase() === "admin") return true;
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function signupAction(
  _prevState: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const name = ((formData.get("name") as string | null) ?? "").trim();
  const email = ((formData.get("email") as string | null) ?? "").trim().toLowerCase();
  const password = (formData.get("password") as string | null) ?? "";

  if (!name || !email || !password) {
    return { error: "Enter name, email, and password.", errorId: Date.now() };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters.", errorId: Date.now() };
  }

  const result = await signupCustomer(name, email, password);
  if (!result.ok) {
    return { error: result.error ?? "Signup failed.", errorId: Date.now() };
  }

  return {
    error: null,
    verificationEmail: email,
    message: result.message ?? "Verification code sent.",
  };
}

export async function verifySignupAction(
  _prevState: VerifySignupState,
  formData: FormData,
): Promise<VerifySignupState> {
  const email = ((formData.get("email") as string | null) ?? "").trim().toLowerCase();
  const code = ((formData.get("code") as string | null) ?? "").trim();

  if (!email || !code) {
    return { error: "Enter the verification code.", errorId: Date.now() };
  }

  const result = await verifyCustomerEmail(email, code);
  if (!result.ok) {
    return { error: result.error ?? "Verification failed.", errorId: Date.now() };
  }

  redirect("/customer/onboarding");
}

export async function socialLoginAction(provider: "google" | "apple", token: string): Promise<SocialLoginState> {
  if (!token) return { ok: false, error: "Missing social login token." };
  const result = await socialLoginCustomer(provider, token);
  if (!result.ok) return { ok: false, error: result.error ?? "Social login failed." };
  const completed = result.user ? await isCustomerOnboardingCompleted(result.user.username) : false;
  return {
    ok: true,
    redirectTo: completed ? "/customer/dashboard" : "/customer/onboarding",
  };
}

export async function logoutAction(): Promise<void> {
  await logoutCustomer();
  redirect("/customer/login");
}
