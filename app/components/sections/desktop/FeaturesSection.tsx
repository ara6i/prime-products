"use client";

import { useState } from "react";
import Image from "next/image";
import { Reveal } from "../../shared/Reveal";
import { SectionHeading } from "../../shared/SectionHeading";
import { cn } from "@/app/shared/lib/utils";
import { useLandingLanguage } from "@/app/landing/i18n";

export function FeaturesSection() {
  const [active, setActive] = useState(0);
  const { content, translate } = useLandingLanguage();
  const { features } = content;
  const tabs = features.tabs;
  const activeTab = tabs[active];

  return (
    <section className="px-8 py-[clamp(5rem,7vw,7rem)]">
      <div className="mx-auto flex w-[86.111vw] flex-col gap-12">
        <SectionHeading eyebrow={features.eyebrow} title={features.title} />

        <Reveal variant="fade" delay={1} className="flex flex-wrap justify-center gap-2">
          {tabs.map((tab, i) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active === i}
              onClick={() => setActive(i)}
              className={cn(
                "inline-flex items-center gap-3 rounded-full border px-5 py-2.5 text-sm font-medium transition-all",
                active === i
                  ? "border-brand-blue bg-brand-blue-pale/60 text-brand-blue-dark shadow-[0_0_0_4px_rgba(33,84,239,0.08)]"
                  : "border-text-primary/10 bg-white text-text-body hover:border-brand-blue/30 hover:text-text-primary"
              )}
            >
              <span className="text-[11px] font-mono text-text-hint">0{i + 1}</span>
              {tab.label}
            </button>
          ))}
        </Reveal>

        <Reveal delay={2}>
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-center">
            <div key={`copy-${active}`} className="flex flex-col gap-4 animate-in fade-in slide-in-from-left-4 duration-500">
              <span className="text-xs font-mono uppercase tracking-[0.14em] text-brand-blue">
                {translate("Capability")} 0{active + 1}
              </span>
              <h3 className="text-[clamp(1.75rem,1.4rem+1.2vw,2.5rem)] font-semibold leading-[1.15] tracking-[-0.02em] text-text-primary">
                {activeTab.title}
              </h3>
              <p className="max-w-[48ch] text-base leading-[1.65] text-text-body">{activeTab.body}</p>
            </div>

            <div
              key={`img-${active}`}
              className="relative aspect-[16/10] w-full overflow-hidden rounded-3xl border border-text-primary/8 bg-surface-light shadow-[0_12px_40px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.04)] animate-in fade-in zoom-in-95 duration-500"
            >
              <Image
                src={activeTab.image}
                alt={activeTab.title}
                fill
                sizes="(min-width: 1024px) 720px, 100vw"
                className="object-cover"
              />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
