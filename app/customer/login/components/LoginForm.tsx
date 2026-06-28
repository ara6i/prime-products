"use client";

import Script from "next/script";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppleIcon, GoogleIcon } from "@/app/shared/components/icons";
import {
  loginAction,
  signupAction,
  socialLoginAction,
  verifySignupAction,
  type LoginState,
  type SignupState,
  type VerifySignupState,
} from "../actions";

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

const SUPPORT_EMAIL = "support@primestyleai.com";
const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const appleClientId = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID ?? "";
const showCustomerSocialAuth = process.env.NEXT_PUBLIC_CUSTOMER_SOCIAL_AUTH_ENABLED === "true";
const showCustomerSignup = process.env.NEXT_PUBLIC_CUSTOMER_SIGNUP_ENABLED === "true";
const initialLoginState: LoginState = { error: null, errorId: 0 };
const initialSignupState: SignupState = { error: null, errorId: 0, verificationEmail: null, message: null };
const initialVerifyState: VerifySignupState = { error: null, errorId: 0 };

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loginState, loginFormAction, loginPending] = useActionState(loginAction, initialLoginState);
  const [signupState, signupFormAction, signupPending] = useActionState(signupAction, initialSignupState);
  const [verifyState, verifyFormAction, verifyPending] = useActionState(verifySignupAction, initialVerifyState);
  const [socialConsent, setSocialConsent] = useState(false);
  const [socialPending, startSocialTransition] = useTransition();
  const googleReadyRef = useRef(false);
  const requiresSignupConsent = mode === "signup";

  useEffect(() => {
    if (!loginState.error || !loginState.errorId) return;
    toast.error(loginState.error, {
      description: "Need support? Contact the PrimeStyleAI support team.",
    });
  }, [loginState.error, loginState.errorId]);

  useEffect(() => {
    if (!signupState.error || !signupState.errorId) return;
    toast.error(signupState.error);
  }, [signupState.error, signupState.errorId]);

  useEffect(() => {
    if (!verifyState.error || !verifyState.errorId) return;
    toast.error(verifyState.error);
  }, [verifyState.error, verifyState.errorId]);

  useEffect(() => {
    if (!signupState.message || !signupState.verificationEmail) return;
    toast.success(signupState.message, {
      description: "Enter the code from your email to continue onboarding.",
    });
  }, [signupState.message, signupState.verificationEmail]);

  const finishSocialLogin = (provider: "google" | "apple", token: string) => {
    startSocialTransition(async () => {
      const result = await socialLoginAction(provider, token);
      if (!result.ok) {
        toast.error(result.error ?? "Social login failed.");
        return;
      }
      router.push(result.redirectTo ?? "/customer/onboarding");
      router.refresh();
    });
  };

  const initializeGoogle = () => {
    if (!googleClientId || !window.google?.accounts?.id || googleReadyRef.current) return;
    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: (response) => {
        if (!response.credential) {
          toast.error("Google did not return a login token.");
          return;
        }
        finishSocialLogin("google", response.credential);
      },
    });
    googleReadyRef.current = true;
  };

  const startGoogle = () => {
    if (requiresSignupConsent && !socialConsent) {
      toast.warning("Consent required", { description: "Confirm the terms before continuing with social login." });
      return;
    }
    initializeGoogle();
    if (!googleClientId || !window.google?.accounts?.id) {
      toast.error("Google login is not configured.");
      return;
    }
    window.google.accounts.id.prompt();
  };

  const startApple = () => {
    if (requiresSignupConsent && !socialConsent) {
      toast.warning("Consent required", { description: "Confirm the terms before continuing with social login." });
      return;
    }
    if (!appleClientId || !window.AppleID?.auth) {
      toast.error("Apple login is not configured.");
      return;
    }
    startSocialTransition(async () => {
      try {
        window.AppleID?.auth?.init({
          clientId: appleClientId,
          scope: "name email",
          redirectURI: `${window.location.origin}/customer/login`,
          usePopup: true,
        });
        const result = await window.AppleID?.auth?.signIn();
        const token = result?.authorization?.id_token;
        if (!token) {
          toast.error("Apple did not return a login token.");
          return;
        }
        await socialLoginAction("apple", token).then((response) => {
          if (!response.ok) {
            toast.error(response.error ?? "Apple login failed.");
            return;
          }
          router.push(response.redirectTo ?? "/customer/onboarding");
          router.refresh();
        });
      } catch {
        toast.error("Apple login was cancelled or failed.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-[var(--spacing-admin-gap-md)] max-lg:gap-4">
      {showCustomerSocialAuth ? (
        <>
          <Script
            src="https://accounts.google.com/gsi/client"
            strategy="lazyOnload"
            onLoad={initializeGoogle}
          />
          <Script
            src="https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js"
            strategy="lazyOnload"
          />
        </>
      ) : null}

      {showCustomerSignup ? (
        <div className="grid grid-cols-2 rounded-full border border-brand-blue/15 bg-brand-blue-pale/35 p-1">
          {(["login", "signup"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setMode(item)}
              className={`h-10 rounded-full text-sm font-semibold transition-colors ${
                mode === item ? "bg-white text-brand-blue shadow-sm" : "text-text-body hover:text-brand-blue"
              }`}
            >
              {item === "login" ? "Log in" : "Sign up"}
            </button>
          ))}
        </div>
      ) : null}

      {!showCustomerSignup || mode === "login" ? (
        <LoginFields formAction={loginFormAction} pending={loginPending} error={loginState.error} />
      ) : signupState.verificationEmail ? (
        <VerifyFields
          formAction={verifyFormAction}
          pending={verifyPending}
          email={signupState.verificationEmail}
          error={verifyState.error}
        />
      ) : (
        <SignupFields formAction={signupFormAction} pending={signupPending} error={signupState.error} />
      )}

      {showCustomerSocialAuth ? (
        <>
          <div className="relative py-1 text-center text-xs font-semibold uppercase tracking-[0.12em] text-text-hint">
            <span className="relative z-10 bg-white px-3">or continue with</span>
            <span className="absolute left-0 top-1/2 h-px w-full bg-brand-blue/10" aria-hidden />
          </div>

          {requiresSignupConsent ? (
            <label className="flex items-start gap-3 rounded-2xl border border-brand-blue/12 bg-[#f8fbff] p-4 text-sm leading-6 text-text-body">
              <input
                type="checkbox"
                checked={socialConsent}
                onChange={(event) => setSocialConsent(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-brand-blue/30 text-brand-blue focus:ring-brand-blue"
              />
              <span>
                I agree to the{" "}
                <Link href="/terms" className="font-semibold text-brand-blue hover:underline">Terms of Service</Link>, acknowledge the{" "}
                <Link href="/privacy-policy" className="font-semibold text-brand-blue hover:underline">Privacy Policy</Link>, understand that my profile photo and measurements may be stored to provide cross-site sizing and virtual try-on services, and understand recommendations are estimates, not guarantees.
              </span>
            </label>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <SocialButton
              icon={<GoogleIcon className="h-5 w-5" />}
              label="Google"
              disabled={socialPending}
              onClick={startGoogle}
            />
            <SocialButton
              icon={<AppleIcon className="h-5 w-5" />}
              label="Apple"
              disabled={socialPending || !appleClientId}
              onClick={startApple}
            />
          </div>
        </>
      ) : null}

      <p className="text-center text-xs leading-5 text-text-hint">
        Need support?{" "}
        <Link href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-brand-blue hover:underline">
          Contact PrimeStyleAI
        </Link>
      </p>
    </div>
  );
}

function LoginFields({
  formAction,
  pending,
  error,
}: {
  formAction: (formData: FormData) => void;
  pending: boolean;
  error: string | null;
}) {
	return (
		<form action={formAction} className="flex flex-col gap-[var(--spacing-admin-gap-md)] max-lg:gap-4">
			<Field label="Email" name="username" type="text" autoComplete="username" />
			<Field label="Password" name="password" type="password" autoComplete="current-password" />
			<InlineError error={error} />
			<PrimaryButton pending={pending} label="Sign in" pendingLabel="Signing in" />
    </form>
  );
}

function SignupFields({
  formAction,
  pending,
  error,
}: {
  formAction: (formData: FormData) => void;
  pending: boolean;
  error: string | null;
}) {
  return (
    <form action={formAction} className="flex flex-col gap-[var(--spacing-admin-gap-md)] max-lg:gap-4">
      <Field label="Full name" name="name" type="text" autoComplete="name" />
      <Field label="Work email" name="email" type="email" autoComplete="email" />
      <Field label="Password" name="password" type="password" autoComplete="new-password" />
      <InlineError error={error} />
      <PrimaryButton pending={pending} label="Create account" pendingLabel="Creating account" />
    </form>
  );
}

function VerifyFields({
  formAction,
  pending,
  email,
  error,
}: {
  formAction: (formData: FormData) => void;
  pending: boolean;
  email: string;
  error: string | null;
}) {
  return (
    <form action={formAction} className="flex flex-col gap-[var(--spacing-admin-gap-md)] max-lg:gap-4">
      <input type="hidden" name="email" value={email} />
      <div className="rounded-2xl border border-brand-blue/12 bg-[#f8fbff] p-4 text-sm leading-6 text-text-body">
        We sent a verification code to <span className="font-semibold text-text-primary">{email}</span>.
      </div>
      <Field label="Verification code" name="code" type="text" autoComplete="one-time-code" />
      <InlineError error={error} />
      <PrimaryButton pending={pending} label="Verify and continue" pendingLabel="Verifying" />
    </form>
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
    <div className="flex flex-col gap-[0.313vw] max-lg:gap-1.5">
      <label htmlFor={name} className="text-admin-xs font-medium text-text-primary max-lg:text-sm">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required
        className="h-[2.604vw] w-full rounded-[0.521vw] border border-admin-border bg-admin-surface-card px-[var(--spacing-admin-gap-md)] text-admin-sm text-text-primary placeholder:text-text-hint transition-colors focus:border-brand-blue focus:outline-none focus:ring-[0.156vw] focus:ring-brand-blue-pale max-lg:h-11 max-lg:rounded-xl max-lg:px-3 max-lg:text-sm"
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
      className="mt-[0.313vw] inline-flex h-[2.604vw] items-center justify-center gap-2 rounded-[52.083vw] bg-brand-blue text-admin-sm font-semibold text-white transition-colors hover:bg-brand-blue-dark disabled:cursor-not-allowed disabled:opacity-60 max-lg:mt-1 max-lg:h-11 max-lg:rounded-full max-lg:text-sm"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
      {pending ? pendingLabel : label}
    </button>
  );
}

function SocialButton({
  icon,
  label,
  disabled,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-brand-blue/15 bg-white text-sm font-semibold text-text-primary transition-colors hover:border-brand-blue/35 hover:text-brand-blue disabled:cursor-not-allowed disabled:opacity-50"
    >
      {icon}
      {label}
    </button>
  );
}
