"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "../actions";

const initialState: LoginState = { error: null };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-[var(--spacing-admin-gap-md)] max-lg:gap-4">
      <div className="flex flex-col gap-[0.313vw] max-lg:gap-1.5">
        <label
          htmlFor="username"
          className="text-admin-xs font-medium text-text-primary max-lg:text-sm"
        >
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          className="w-full h-[2.604vw] px-[var(--spacing-admin-gap-md)] rounded-[0.521vw] border border-admin-border bg-admin-surface-card text-admin-sm text-text-primary placeholder:text-text-hint focus:outline-none focus:border-brand-blue focus:ring-[0.156vw] focus:ring-brand-blue-pale transition-colors max-lg:h-11 max-lg:rounded-xl max-lg:px-3 max-lg:text-sm"
        />
      </div>

      <div className="flex flex-col gap-[0.313vw] max-lg:gap-1.5">
        <label
          htmlFor="password"
          className="text-admin-xs font-medium text-text-primary max-lg:text-sm"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full h-[2.604vw] px-[var(--spacing-admin-gap-md)] rounded-[0.521vw] border border-admin-border bg-admin-surface-card text-admin-sm text-text-primary placeholder:text-text-hint focus:outline-none focus:border-brand-blue focus:ring-[0.156vw] focus:ring-brand-blue-pale transition-colors max-lg:h-11 max-lg:rounded-xl max-lg:px-3 max-lg:text-sm"
        />
      </div>

      {state.error && (
        <div
          role="alert"
          className="rounded-[0.417vw] border border-admin-status-suspended-text/20 bg-admin-status-suspended-bg/60 px-[var(--spacing-admin-gap-md)] py-[0.521vw] text-admin-sm text-admin-status-suspended-text max-lg:rounded-lg max-lg:px-3 max-lg:py-2 max-lg:text-sm"
        >
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-[0.313vw] h-[2.604vw] rounded-[52.083vw] bg-brand-blue text-white text-admin-sm font-semibold hover:bg-brand-blue-dark disabled:opacity-60 disabled:cursor-not-allowed transition-colors max-lg:h-11 max-lg:rounded-full max-lg:text-sm max-lg:mt-1"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
