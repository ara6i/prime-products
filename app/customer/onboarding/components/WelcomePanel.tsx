"use client";

import { ArrowRight, BarChart3, Check, KeyRound, ShieldCheck } from "lucide-react";

interface WelcomePanelProps {
  onContinue: () => void;
}

const highlights = [
  {
    title: "SDK workspace",
    description: "Create the merchant profile we use for review, allowed domains, and dashboard analytics.",
    icon: KeyRound,
  },
  {
    title: "Storefront trust",
    description: "Verify the website before production traffic is accepted from the SDK.",
    icon: ShieldCheck,
  },
  {
    title: "Review step",
    description: "PrimeStyleAI reviews each workspace before production access is enabled.",
    icon: BarChart3,
  },
];

export function WelcomePanel({ onContinue }: WelcomePanelProps) {
  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-blue">
        SDK setup
      </p>
      <h2 className="mt-3 max-w-[650px] text-[clamp(2rem,1.2rem+1.8vw,3.1rem)] font-semibold leading-[1.05] tracking-[-0.04em] text-[#111827]">
        Let’s set up your production workspace.
      </h2>
      <p className="mt-4 max-w-[620px] text-base leading-7 text-[#5f6b7a]">
        PrimeStyleAI needs a detailed business profile and trusted storefront domain before your SDK workspace can move to review.
      </p>

      <div className="mt-8 rounded-2xl border border-[#e6edf7] bg-[#fbfdff]">
        {highlights.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.title}
              className="grid grid-cols-[40px_1fr] gap-4 border-b border-[#e6edf7] px-5 py-4 last:border-b-0"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-brand-blue shadow-sm ring-1 ring-[#dbe6f5]">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-[#111827]">
                  {item.title}
                </h3>
                <p className="mt-1 text-sm leading-6 text-[#667085]">
                  {item.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[#edf2f7] pt-6">
        <p className="inline-flex items-center gap-2 text-sm text-[#667085]">
          <Check className="h-4 w-4 text-brand-blue" aria-hidden />
          Takes about 3 minutes
        </p>
        <button
          type="button"
          onClick={onContinue}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-blue px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-dark"
        >
          Continue
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </section>
  );
}
