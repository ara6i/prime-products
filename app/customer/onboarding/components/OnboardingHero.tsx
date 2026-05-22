import Image from "next/image";
import { ShieldCheck } from "lucide-react";

interface OnboardingHeroProps {
  storeName: string;
  domain: string;
}

export function OnboardingHero({
  storeName,
  domain,
}: OnboardingHeroProps) {
  return (
    <section className="shrink-0">
      <div className="flex items-center justify-between">
        <Image
          src="/images/landing/optimized/logo-navbar-transparent.webp"
          alt="PrimeStyleAI"
          width={116}
          height={108}
          className="h-auto w-[76px] object-contain sm:w-[92px]"
          priority
        />
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-blue/15 bg-white/90 px-3.5 py-2 text-xs font-semibold text-brand-blue">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
          Merchant onboarding
        </div>
      </div>

      <div className="mx-auto mt-1 max-w-[880px] text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-blue">
          Welcome back, {storeName}
        </p>
        <h1 className="mt-2 text-[clamp(1.9rem,1.35rem+1.65vw,3.05rem)] font-semibold leading-[1.02] tracking-[-0.035em] text-text-primary">
          Set up your production workspace
        </h1>
        <p className="mx-auto mt-2 max-w-[560px] text-sm leading-[1.65] text-text-body sm:text-base">
          A guided setup for <span className="font-semibold text-text-primary">{domain}</span>, one focused step at a time.
        </p>
      </div>
    </section>
  );
}
