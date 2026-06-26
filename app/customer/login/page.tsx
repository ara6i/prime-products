import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Toaster } from "sonner";
import { getCustomerMe } from "@/app/customer/shared/services/customerAuthService";
import { isCustomerOnboardingCompleted } from "@/app/customer/shared/services/customerOnboardingCompletion";
import { LoginForm } from "./components/LoginForm";
import { LoginMobileHeader } from "./components/LoginMobileHeader";

export const dynamic = "force-dynamic";

export default async function CustomerLoginPage() {
  const me = await getCustomerMe();

  if (me?.role === "merchant") {
    if (await isCustomerOnboardingCompleted(me.username)) redirect("/customer/dashboard");
    redirect("/customer/onboarding");
  }

  return (
    <>
      <div className="min-h-screen bg-[#eef2ff] lg:p-5">
        <div className="lg:hidden">
          <LoginMobileHeader />
        </div>

        <div className="px-5 pt-8 lg:hidden">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-text-body transition-colors hover:text-brand-blue"
          >
            <ArrowLeft size={16} aria-hidden />
            Back to home
          </Link>
        </div>

        <div className="mx-auto mt-4 grid min-h-[calc(100vh-128px)] w-full max-w-[1480px] overflow-hidden bg-white lg:mt-0 lg:min-h-[calc(100vh-40px)] lg:rounded-[28px] lg:border lg:border-brand-blue/10 lg:shadow-[0_26px_70px_rgba(33,84,239,0.14)] lg:grid-cols-[1.08fr_0.92fr]">
          <aside className="relative hidden overflow-hidden bg-[radial-gradient(120%_120%_at_80%_0%,rgba(74,58,232,0.18),transparent_58%),linear-gradient(165deg,#f6f8ff_0%,#eef3ff_52%,#e6edff_100%)] lg:flex">
            <div className="absolute -right-16 -top-20 h-72 w-72 rounded-full bg-brand-blue/15 blur-3xl" aria-hidden />
            <div className="absolute -left-24 -bottom-24 h-80 w-80 rounded-full bg-[#4A3AE8]/12 blur-3xl" aria-hidden />

            <div className="relative z-10 flex h-full w-full flex-col px-8 pb-7 pt-8 xl:px-10 xl:pb-8 xl:pt-9">
              <div className="max-w-[46ch]">
                <Image
                  src="/images/landing/optimized/logo-navbar-transparent.webp"
                  alt="PrimeStyleAI"
                  width={130}
                  height={120}
                  className="h-auto w-[126px] object-contain"
                  priority
                />
                <p className="mt-5 inline-flex rounded-full border border-brand-blue/20 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-brand-blue-dark">
                  Customer Login
                </p>
                <h1 className="mt-4 max-w-[28ch] text-[clamp(1.9rem,1.34rem+1vw,2.45rem)] font-semibold leading-[1.1] tracking-[-0.02em] text-text-primary">
                  Welcome back to your PrimeStyle workspace.
                </h1>
                <p className="mt-2.5 max-w-[42ch] text-[14px] leading-[1.6] text-text-body">
                  Access your API keys, try-on and sizing analytics, conversion and return insights, and dedicated tools for your business.
                </p>
              </div>

              <div className="relative mt-3 flex flex-1 items-center justify-center">
                <div className="relative w-[126%] max-w-none overflow-hidden rounded-[22px] shadow-[0_34px_62px_rgba(33,84,239,0.18)]">
                  <Image
                    src="/images/login/customer-login-hero.png"
                    alt="PrimeStyle AI try-on and sizing preview"
                    width={1080}
                    height={860}
                    className="h-auto min-h-[500px] w-full object-cover object-center"
                  />
                </div>

                <div className="floating-badge-primary absolute left-4 top-[12%] min-w-[168px] rounded-2xl border border-brand-blue/15 bg-white/92 px-4 py-3 shadow-[0_14px_30px_rgba(33,84,239,0.16)] backdrop-blur-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-blue-dark">Try-on</p>
                  <p className="mt-1 text-sm font-semibold text-text-primary">Generation Ready</p>
                </div>

                <div className="floating-badge-secondary absolute bottom-[11%] right-10 min-w-[176px] rounded-2xl border border-brand-blue/15 bg-white/92 px-4 py-3 shadow-[0_14px_30px_rgba(33,84,239,0.16)] backdrop-blur-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-blue-dark">Sizing</p>
                  <p className="mt-1 text-sm font-semibold text-text-primary">Guide Intelligence</p>
                </div>
              </div>
            </div>
          </aside>

          <section className="flex items-center justify-center bg-white px-5 py-8 sm:px-8 md:px-10 lg:px-12">
            <div className="w-full max-w-[500px]">
              <div className="rounded-[26px] border border-brand-blue/12 bg-white p-6 shadow-[0_20px_48px_rgba(33,84,239,0.1)] sm:p-8">
                <div className="mb-6 text-center lg:text-left">
                  <span className="inline-flex rounded-full border border-brand-blue/20 bg-brand-blue-pale/45 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-blue-dark">
                    Customer Dashboard
                  </span>
                  <h2 className="mt-3 text-[30px] font-semibold leading-[1.08] tracking-[-0.02em] text-text-primary">
                    Log in or create your workspace
                  </h2>
                  <p className="mt-2 text-[15px] leading-[1.6] text-text-body">
                    Start SDK onboarding, verify your domain, and request production access.
                  </p>
                </div>

                <LoginForm />
              </div>
            </div>
          </section>
        </div>
      </div>

      <Toaster
        position="top-right"
        closeButton
        toastOptions={{
          className: "rounded-2xl",
          style: {
            background: "#ffffff",
            color: "#0f172a",
            border: "1px solid rgba(33,84,239,0.22)",
            boxShadow: "0 16px 44px rgba(33,84,239,0.16)",
            width: "min(92vw, 420px)",
          },
        }}
      />
    </>
  );
}
