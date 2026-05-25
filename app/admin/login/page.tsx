import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAdminMe } from "@/app/admin/shared/services/adminAuthService";
import { LoginForm } from "./components/LoginForm";
import { LoginMobileHeader } from "./components/LoginMobileHeader";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const me = await getAdminMe();
  if (me?.role === "admin") redirect("/admin");

  return (
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
                Admin Login
              </p>
              <h1 className="mt-4 max-w-[28ch] text-[clamp(1.9rem,1.34rem+1vw,2.45rem)] font-semibold leading-[1.1] tracking-[-0.02em] text-text-primary">
                PrimeStyle operator workspace.
              </h1>
              <p className="mt-2.5 max-w-[42ch] text-[14px] leading-[1.6] text-text-body">
                Manage merchants, monitor platform analytics, and review operational performance from the admin dashboard.
              </p>
            </div>
          </div>
        </aside>

        <section className="flex items-center justify-center bg-white px-5 py-8 sm:px-8 md:px-10 lg:px-12">
          <div className="w-full max-w-[500px]">
            <div className="rounded-[26px] border border-brand-blue/12 bg-white p-6 shadow-[0_20px_48px_rgba(33,84,239,0.1)] sm:p-8">
              <div className="mb-6 text-center lg:text-left">
                <span className="inline-flex rounded-full border border-brand-blue/20 bg-brand-blue-pale/45 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-blue-dark">
                  Admin Dashboard
                </span>
                <h2 className="mt-3 text-[30px] font-semibold leading-[1.08] tracking-[-0.02em] text-text-primary">
                  Welcome back
                </h2>
                <p className="mt-2 text-[15px] leading-[1.6] text-text-body">
                  Sign in with your username and password to continue.
                </p>
              </div>

              <LoginForm />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
