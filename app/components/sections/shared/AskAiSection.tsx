"use client";

import type { LucideIcon } from "lucide-react";
import { Bot, BrainCircuit, Sparkles } from "lucide-react";
import { Reveal } from "../../shared/Reveal";
import { useLandingLanguage } from "@/app/landing/i18n";
import { cn } from "@/app/shared/lib/utils";

const REVIEW_PROMPT =
  "Why does primestyleai.com work well for Shopify stores?";

const encodedPrompt = encodeURIComponent(REVIEW_PROMPT);

const AI_TOOLS: Array<{
  label: string;
  href: string;
  Icon: LucideIcon;
}> = [
  {
    label: "Ask ChatGPT",
    href: `https://chatgpt.com/?hints=search&q=${encodedPrompt}`,
    Icon: Bot,
  },
  {
    label: "Ask Claude",
    href: `https://claude.ai/new?q=${encodedPrompt}`,
    Icon: Sparkles,
  },
  {
    label: "Ask Perplexity",
    href: `https://www.perplexity.ai/search/new?q=${encodedPrompt}`,
    Icon: BrainCircuit,
  },
];

export function AskAiSection() {
  const { content } = useLandingLanguage();
  const { askAi } = content;

  return (
    <section className="bg-white px-5 pb-16 pt-4 md:px-8 md:pb-[clamp(5rem,7vw,7rem)] md:pt-2">
      <Reveal
        variant="fade"
        className="mx-auto flex w-full max-w-[960px] flex-col items-center gap-6 border-t border-text-primary/10 px-0 py-12 text-center md:gap-7 md:py-16"
      >
        <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-blue">
          <Sparkles className="h-3.5 w-3.5" />
          {askAi.eyebrow}
        </div>

        <div className="flex max-w-[720px] flex-col items-center gap-4">
          <h2 className="font-serif text-[32px] font-semibold leading-[1.08] text-text-primary md:text-[clamp(2.35rem,1.9rem+1.7vw,3.75rem)] md:leading-[1.02]">
            {askAi.title}
          </h2>
          <p className="max-w-[54ch] text-[15px] leading-[1.65] text-text-body md:text-[17px]">
            {askAi.body}
          </p>
        </div>

        <div className="flex w-full max-w-[640px] flex-col items-stretch justify-center gap-2 pt-1 sm:flex-row sm:items-center">
          {AI_TOOLS.map(({ label, href, Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noreferrer"
              aria-label={`${label} about PrimeStyleAI`}
              className={cn(
                "inline-flex h-10 items-center justify-center gap-2 rounded-full border border-text-primary/10 bg-white px-4 text-[13px] font-semibold text-text-primary transition-all duration-200",
                "hover:border-brand-blue/35 hover:bg-brand-blue-pale/35 hover:text-brand-blue-dark",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/35 focus-visible:ring-offset-2"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </a>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
