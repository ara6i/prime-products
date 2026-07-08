"use client";

import Script from "next/script";
import Link from "next/link";
import { Mail, Loader2 } from "lucide-react";
import { AppleIcon, GoogleIcon } from "@/app/shared/components/icons";
import { usePdpStudioAuthForm } from "../hooks/usePdpStudioAuthForm";

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (options: { client_id: string; callback: (response: { credential?: string }) => void }) => void;
          prompt: () => void;
        };
      };
    };
    AppleID?: {
      auth?: {
        init: (options: Record<string, unknown>) => void;
        signIn: () => Promise<{ authorization?: { id_token?: string } }>;
      };
    };
  }
}

export function PdpStudioLoginForm({ compact = false }: { compact?: boolean }) {
  const {
    mode,
    setMode,
    emailOpen,
    setEmailOpen,
    loginFormAction,
    loginPending,
    signupFormAction,
    signupPending,
    activeError,
    socialPending,
    googleConfigured,
    appleConfigured,
    startGoogle,
    startApple,
    startFacebook,
  } = usePdpStudioAuthForm();

  return (
    <div className="flex flex-col gap-5">
      <Script src="https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js" strategy="lazyOnload" />

      <div className="flex flex-col gap-3">
        <AuthProviderButton
          icon={<GoogleIcon className="h-6 w-6" />}
          label="Continue with Google"
          onClick={startGoogle}
          disabled={socialPending || !googleConfigured}
          primary
        />
        <AuthProviderButton
          icon={<FacebookIcon />}
          label="Continue with Facebook"
          onClick={startFacebook}
          disabled={socialPending}
        />
        <AuthProviderButton
          icon={<AppleIcon className="h-6 w-6" />}
          label="Continue with Apple"
          onClick={startApple}
          disabled={socialPending || !appleConfigured}
        />
      </div>

      <div className="relative py-1 text-center text-xs font-medium uppercase text-black/45">
        <span className="relative z-10 bg-white px-3">or</span>
        <span className="absolute left-0 top-1/2 h-px w-full bg-black/10" aria-hidden />
      </div>

      {!emailOpen ? (
        <AuthProviderButton
          icon={<Mail className="h-6 w-6 text-black/45" />}
          label="Continue with personal or work email"
          onClick={() => setEmailOpen(true)}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 rounded-full border border-black/10 bg-black/[0.03] p-1">
            {(["login", "signup"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setMode(item)}
                className={`h-10 rounded-full text-sm font-semibold transition-colors ${
                  mode === item ? "bg-white text-brand-blue shadow-sm" : "text-black/60 hover:text-brand-blue"
                }`}
              >
                {item === "login" ? "Log in" : "Sign up"}
              </button>
            ))}
          </div>

          {mode === "login" ? (
            <form action={loginFormAction} className="flex flex-col gap-4">
              <Field label="Work email" name="email" type="email" autoComplete="email" />
              <Field label="Password" name="password" type="password" autoComplete="current-password" />
              <InlineError error={activeError} />
              <PrimaryButton pending={loginPending} label="Open PDP Studio" pendingLabel="Signing in" />
            </form>
          ) : (
            <form action={signupFormAction} className="flex flex-col gap-4">
              <Field label="Full name" name="name" type="text" autoComplete="name" />
              <Field label="Work email" name="email" type="email" autoComplete="email" />
              <Field label="Password" name="password" type="password" autoComplete="new-password" />
              <InlineError error={activeError} />
              <PrimaryButton pending={signupPending} label="Create account" pendingLabel="Creating account" />
            </form>
          )}
        </div>
      )}

      {compact ? (
        <p className="text-center text-xs leading-5 text-black/45">
          By signing up, you agree to our{" "}
          <Link href="/terms" className="font-semibold text-brand-blue hover:underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy-policy" className="font-semibold text-brand-blue hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      ) : (
        <p className="text-center text-xs leading-5 text-text-hint">
          PDP Studio accounts are separate from customer dashboard accounts.{" "}
          <Link href="/customer/login" className="font-semibold text-brand-blue hover:underline">
            Customer login
          </Link>
        </p>
      )}
    </div>
  );
}

function AuthProviderButton({
  icon,
  label,
  onClick,
  disabled = false,
  primary = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`grid h-12 w-full grid-cols-[48px_1fr_48px] items-center rounded-lg px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${
        primary ? "bg-[#191919] text-white hover:bg-black" : "bg-[#f4f4f4] text-[#1d1d1f] hover:bg-[#eeeeee]"
      }`}
    >
      <span className="flex items-center justify-center">{icon}</span>
      <span className="text-center">{label}</span>
      <span aria-hidden />
    </button>
  );
}

function FacebookIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="#1877F2" />
      <path
        fill="#fff"
        d="M13.6 18v-5.45h1.82l.27-2.13H13.6V9.06c0-.62.17-1.04 1.05-1.04h1.12V6.11C15.58 6.08 14.91 6 14.14 6c-1.61 0-2.71.99-2.71 2.8v1.62H9.6v2.13h1.83V18h2.17Z"
      />
    </svg>
  );
}

function Field({
  label,
  name,
  type,
  autoComplete,
}: {
  label: string;
  name: string;
  type: string;
  autoComplete: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium text-text-primary">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required
        className="h-11 w-full rounded-xl border border-admin-border bg-admin-surface-card px-3 text-sm text-text-primary placeholder:text-text-hint transition-colors focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue-pale"
      />
    </div>
  );
}

function InlineError({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
      {error}
    </div>
  );
}

function PrimaryButton({
  pending,
  label,
  pendingLabel,
}: {
  pending: boolean;
  label: string;
  pendingLabel: string;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brand-blue px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-dark disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
      {pending ? pendingLabel : label}
    </button>
  );
}
