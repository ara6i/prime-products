import type { Metadata } from "next";
import Image from "next/image";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  isSiteAuthEnabled,
  sanitizeRedirectPath,
  SITE_AUTH_COOKIE_NAME,
  verifySiteSessionToken,
} from "@/app/shared/auth/siteSession";
import { LoginForm } from "./components/LoginForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "PrimeStyleAI Login",
  description: "Secure local access for PrimeStyleAI.",
};

export default async function SiteLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const params = await searchParams;
  const redirectTo = sanitizeRedirectPath(params.from);

  if (!isSiteAuthEnabled()) {
    redirect("/");
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(SITE_AUTH_COOKIE_NAME)?.value ?? "";
  const session = token ? await verifySiteSessionToken(token) : null;

  if (session) {
    redirect(redirectTo);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F6F8FB] px-4 py-8 text-[#1C1D1E]">
      <section className="w-full max-w-[420px] rounded-[24px] border border-[#E1E7F2] bg-white p-6 shadow-[0_22px_60px_rgba(15,23,42,0.1)] sm:p-8">
        <div className="mb-7 flex justify-center">
          <Image
            src="/images/landing/optimized/logo-navbar-transparent.webp"
            alt="PrimeStyleAI"
            width={150}
            height={50}
            priority
            className="h-auto w-[150px]"
          />
        </div>

        <div className="mb-7 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#2154EF]">
            Staging access
          </p>
          <h1 className="mt-3 text-[30px] font-semibold leading-[1.1] sm:text-[34px]">
            Sign in
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#59616E]">
            Enter your login and password to continue.
          </p>
        </div>

        <LoginForm redirectTo={redirectTo} />
      </section>
    </main>
  );
}
