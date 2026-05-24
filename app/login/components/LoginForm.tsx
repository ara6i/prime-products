"use client";

import { useActionState } from "react";
import { ArrowRight, LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
import { loginAction, type LoginState } from "../actions";

const initialState: LoginState = { error: null, errorId: 0 };

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="redirectTo" value={redirectTo} />

      <div className="flex flex-col gap-2">
        <label htmlFor="username" className="text-sm font-semibold text-[#1C1D1E]">
          Login
        </label>
        <div className="grid h-12 grid-cols-[44px_1fr] items-center rounded-lg border border-[#D7DCE6] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-colors focus-within:border-[#2154EF] focus-within:ring-4 focus-within:ring-[#DAE7FF]">
          <UserRound className="mx-auto size-5 text-[#6B7280]" aria-hidden />
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            required
            disabled={pending}
            className="h-full min-w-0 rounded-r-lg bg-transparent pr-4 text-[15px] font-medium text-[#1C1D1E] outline-none placeholder:text-[#8A919F] disabled:cursor-not-allowed disabled:opacity-70"
            placeholder="Enter login"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-sm font-semibold text-[#1C1D1E]">
          Password
        </label>
        <div className="grid h-12 grid-cols-[44px_1fr] items-center rounded-lg border border-[#D7DCE6] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-colors focus-within:border-[#2154EF] focus-within:ring-4 focus-within:ring-[#DAE7FF]">
          <LockKeyhole className="mx-auto size-5 text-[#6B7280]" aria-hidden />
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            disabled={pending}
            className="h-full min-w-0 rounded-r-lg bg-transparent pr-4 text-[15px] font-medium text-[#1C1D1E] outline-none placeholder:text-[#8A919F] disabled:cursor-not-allowed disabled:opacity-70"
            placeholder="Enter password"
          />
        </div>
      </div>

      {state.error ? (
        <div
          role="alert"
          className="rounded-lg border border-[#F2B8B5] bg-[#FFF4F4] px-4 py-3 text-sm font-medium leading-5 text-[#B4231B]"
        >
          {state.error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#2154EF] px-5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(33,84,239,0.22)] transition hover:bg-[#193EDC] focus:outline-none focus:ring-4 focus:ring-[#BED6FF] disabled:cursor-not-allowed disabled:opacity-65"
      >
        <ShieldCheck className="size-5" aria-hidden />
        <span>{pending ? "Signing in" : "Sign in securely"}</span>
        <ArrowRight className="size-4" aria-hidden />
      </button>
    </form>
  );
}
