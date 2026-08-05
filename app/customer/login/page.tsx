import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Toaster } from "sonner";
import { getCustomerMe } from "@/app/customer/shared/services/customerAuthService";
import { isCustomerOnboardingCompleted } from "@/app/customer/shared/services/customerOnboardingCompletion";
import { LoginForm } from "./components/LoginForm";
import { LoginMobileHeader } from "./components/LoginMobileHeader";

export const dynamic = "force-dynamic";

const CUSTOMER_LOGIN_VIDEO_WEBM = "/videos/customer/login-hero.webm";
const CUSTOMER_LOGIN_VIDEO_MP4 = "/videos/customer/login-hero.mp4";
const CUSTOMER_LOGIN_VIDEO_POSTER = "/images/login/customer-login-video-poster.jpg";

export default async function CustomerLoginPage() {
  const me = await getCustomerMe();

  if (me?.role === "merchant") {
    if (await isCustomerOnboardingCompleted(me.username)) redirect("/customer/dashboard");
    redirect("/customer/onboarding");
  }

  return (
    <>
      <div className="min-h-screen bg-[#eef2ff] lg:h-screen lg:min-h-0 lg:overflow-hidden lg:p-5">
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

        <div className="mx-auto mt-4 grid min-h-[calc(100vh-128px)] w-full max-w-[1480px] overflow-hidden bg-white lg:mt-0 lg:h-[calc(100vh-40px)] lg:min-h-0 lg:rounded-[28px] lg:border lg:border-brand-blue/10 lg:shadow-[0_26px_70px_rgba(33,84,239,0.14)] lg:grid-cols-[1.08fr_0.92fr]">
          <aside className="relative hidden overflow-hidden bg-[#edf3ff] lg:block">
            <video
              className="absolute inset-0 h-full w-full scale-110 object-cover object-center opacity-45 blur-2xl"
              poster={CUSTOMER_LOGIN_VIDEO_POSTER}
              preload="metadata"
              autoPlay
              muted
              loop
              playsInline
              disablePictureInPicture
              aria-hidden
            >
              <source src={CUSTOMER_LOGIN_VIDEO_WEBM} type="video/webm" />
              <source src={CUSTOMER_LOGIN_VIDEO_MP4} type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-white/10" aria-hidden />
            <video
              className="absolute inset-0 z-10 h-full w-full object-contain object-top"
              poster={CUSTOMER_LOGIN_VIDEO_POSTER}
              preload="metadata"
              autoPlay
              muted
              loop
              playsInline
              disablePictureInPicture
              aria-label="PrimeStyleAI try-on and sizing preview"
            >
              <source src={CUSTOMER_LOGIN_VIDEO_WEBM} type="video/webm" />
              <source src={CUSTOMER_LOGIN_VIDEO_MP4} type="video/mp4" />
            </video>
          </aside>

          <section className="flex items-center justify-center bg-white px-5 py-8 sm:px-8 md:px-10 lg:px-12">
            <div className="w-full max-w-[500px]">
              <div className="rounded-[26px] border border-brand-blue/12 bg-white p-6 shadow-[0_20px_48px_rgba(33,84,239,0.1)] sm:p-8">
                <div className="mb-6 text-center lg:text-left">
                  <span className="inline-flex rounded-full border border-brand-blue/20 bg-brand-blue-pale/45 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-blue-dark">
                    PrimeStyleAI
                  </span>
                  <h2 className="mt-3 text-[30px] font-semibold leading-[1.08] tracking-[-0.02em] text-text-primary">
                    Welcome to PrimeStyleAI
                  </h2>
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
