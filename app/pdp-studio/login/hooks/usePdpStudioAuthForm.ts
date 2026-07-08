"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  loginAction,
  getGoogleAuthUrlAction,
  socialLoginAction,
  signupAction,
  type PdpStudioLoginState,
  type PdpStudioSignupState,
} from "../actions";

const initialLoginState: PdpStudioLoginState = { error: null, errorId: 0 };
const initialSignupState: PdpStudioSignupState = { error: null, errorId: 0 };
const appleClientId =
  process.env.NEXT_PUBLIC_PDP_STUDIO_APPLE_CLIENT_ID ??
  process.env.NEXT_PUBLIC_CUSTOMER_APPLE_CLIENT_ID ??
  process.env.NEXT_PUBLIC_APPLE_CLIENT_ID ??
  "";
const appleRedirectUri =
  process.env.NEXT_PUBLIC_PDP_STUDIO_APPLE_REDIRECT_URI ??
  process.env.NEXT_PUBLIC_CUSTOMER_APPLE_REDIRECT_URI ??
  process.env.NEXT_PUBLIC_SDK_APPLE_REDIRECT_URI ??
  process.env.NEXT_PUBLIC_APPLE_REDIRECT_URI ??
  "";
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "";

function getAppleRedirectUri(): string {
  const configuredRedirect = appleRedirectUri.trim();
  if (configuredRedirect) return configuredRedirect;
  const configuredSiteUrl = siteUrl.trim();
  if (configuredSiteUrl) return `${configuredSiteUrl.replace(/\/+$/, "")}/pdp-studio`;
  if (typeof window === "undefined") return "";
  return `${window.location.origin.replace(/\/+$/, "")}/pdp-studio`;
}

export function usePdpStudioAuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [emailOpen, setEmailOpen] = useState(false);
  const [socialPending, startSocialTransition] = useTransition();
  const [loginState, loginFormAction, loginPending] = useActionState(loginAction, initialLoginState);
  const [signupState, signupFormAction, signupPending] = useActionState(signupAction, initialSignupState);
  const activeError = mode === "login" ? loginState.error : signupState.error;

  useEffect(() => {
    if (loginState.error && loginState.errorId) toast.error(loginState.error);
  }, [loginState.error, loginState.errorId]);

  useEffect(() => {
    if (signupState.error && signupState.errorId) toast.error(signupState.error);
  }, [signupState.error, signupState.errorId]);

  const finishSocialLogin = (provider: "google" | "apple", token: string) => {
    startSocialTransition(async () => {
      const result = await socialLoginAction(provider, token);
      if (!result.ok) {
        toast.error(result.error ?? `${provider} login failed.`);
        return;
      }
      router.refresh();
    });
  };

  const startGoogle = () => {
    startSocialTransition(async () => {
      const result = await getGoogleAuthUrlAction();
      if (!result.ok || !result.url) {
        toast.error(result.error ?? "Google login is not configured for PDP Studio.");
        return;
      }
      window.location.href = result.url;
    });
  };

  const startApple = () => {
    if (!appleClientId || !window.AppleID?.auth) {
      toast.error("Apple login is not configured for PDP Studio.");
      return;
    }
    const redirectURI = getAppleRedirectUri();
    if (!redirectURI) {
      toast.error("Apple login redirect is not configured.");
      return;
    }
    startSocialTransition(async () => {
      try {
        window.AppleID?.auth?.init({
          clientId: appleClientId,
          scope: "name email",
          redirectURI,
          usePopup: true,
        });
        const result = await window.AppleID?.auth?.signIn();
        const token = result?.authorization?.id_token;
        if (!token) {
          toast.error("Apple did not return a login token.");
          return;
        }
        finishSocialLogin("apple", token);
      } catch {
        toast.error("Apple login was cancelled or failed.");
      }
    });
  };

  const startFacebook = () => {
    toast.error("Facebook login is not configured for PDP Studio.");
  };

  return {
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
    googleConfigured: true,
    appleConfigured: Boolean(appleClientId),
    startGoogle,
    startApple,
    startFacebook,
  };
}
