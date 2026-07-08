"use server";

import { redirect } from "next/navigation";
import {
  loginPdpStudio,
  logoutPdpStudio,
  signupPdpStudio,
  socialLoginPdpStudio,
  getPdpStudioGoogleAuthUrl,
} from "@/app/pdp-studio/shared/pdpStudioAuthService";

export interface PdpStudioLoginState {
  error: string | null;
  errorId?: number;
}

export interface PdpStudioSignupState {
  error: string | null;
  errorId?: number;
}

export interface PdpStudioSocialLoginState {
  ok: boolean;
  error?: string;
}

export async function loginAction(
  _prevState: PdpStudioLoginState,
  formData: FormData,
): Promise<PdpStudioLoginState> {
  const email = ((formData.get("email") as string | null) ?? "").trim().toLowerCase();
  const password = (formData.get("password") as string | null) ?? "";

  if (!email || !password) return { error: "Enter both email and password.", errorId: Date.now() };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address.", errorId: Date.now() };

  const result = await loginPdpStudio(email, password);
  if (!result.ok) return { error: result.error ?? "PDP Studio login failed.", errorId: Date.now() };

  redirect("/pdp-studio");
}

export async function signupAction(
  _prevState: PdpStudioSignupState,
  formData: FormData,
): Promise<PdpStudioSignupState> {
  const name = ((formData.get("name") as string | null) ?? "").trim();
  const email = ((formData.get("email") as string | null) ?? "").trim().toLowerCase();
  const password = (formData.get("password") as string | null) ?? "";

  if (!name || !email || !password) return { error: "Enter name, email, and password.", errorId: Date.now() };
  if (password.length < 8) return { error: "Password must be at least 8 characters.", errorId: Date.now() };

  const result = await signupPdpStudio(name, email, password);
  if (!result.ok) return { error: result.error ?? "PDP Studio signup failed.", errorId: Date.now() };

  redirect("/pdp-studio");
}

export async function socialLoginAction(provider: "google" | "apple", token: string): Promise<PdpStudioSocialLoginState> {
  if (!token) return { ok: false, error: "Missing social login token." };
  const result = await socialLoginPdpStudio(provider, token);
  if (!result.ok) return { ok: false, error: result.error ?? `${provider} login failed.` };
  return { ok: true };
}

export async function getGoogleAuthUrlAction(): Promise<{ ok: boolean; url?: string; error?: string }> {
  return getPdpStudioGoogleAuthUrl();
}

export async function logoutAction(): Promise<void> {
  await logoutPdpStudio();
  redirect("/pdp-studio");
}
